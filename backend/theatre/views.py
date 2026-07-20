from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet, OutOfStockError
from api.models import Patient, MedicineBatch, StockTransaction, StockTransactionType
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    OperatingTheatre, TheatreStatus, SurgicalProcedureCatalog, SurgeryBooking,
    BookingStatus, Surgery, SurgeryStatus, SurgicalTeamMember, ConsumableUsage, PostOpNote,
)
from .serializers import (
    OperatingTheatreSerializer, SurgicalProcedureCatalogSerializer,
    SurgeryBookingSerializer, SurgeryBookingListSerializer, CreateBookingSerializer, CancelBookingSerializer,
    SurgerySerializer, StartSurgerySerializer, CompleteSurgerySerializer,
    SurgicalTeamMemberSerializer, AssignTeamMemberSerializer,
    ConsumableUsageSerializer, RecordConsumableSerializer, PostOpNoteSerializer,
)
from .services import raise_theatre_invoice, compute_theatre_time_charge


class OperatingTheatreViewSet(BaseModelViewSet):
    queryset = OperatingTheatre.objects.filter(is_active=True)
    serializer_class = OperatingTheatreSerializer
    filterset_fields = ["status"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=TheatreStatus.AVAILABLE)
        return Response(OperatingTheatreSerializer(qs, many=True).data)


class SurgicalProcedureCatalogViewSet(BaseModelViewSet):
    queryset = SurgicalProcedureCatalog.objects.filter(is_active=True)
    serializer_class = SurgicalProcedureCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class SurgeryBookingViewSet(BaseModelViewSet):
    queryset = SurgeryBooking.objects.select_related("patient", "procedure", "theatre", "primary_surgeon").all()
    filterset_fields = ["status", "priority", "theatre"]
    search_fields = ["booking_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return SurgeryBookingListSerializer
        return SurgeryBookingSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        booking = SurgeryBooking.objects.create(
            patient=patient, procedure_id=data["procedure"], priority=data.get("priority", "ELECTIVE"),
            requested_date=data["requested_date"], theatre_id=data.get("theatre"),
            primary_surgeon_id=data.get("primary_surgeon"), diagnosis=data.get("diagnosis", ""),
            pre_op_notes=data.get("pre_op_notes", ""), admission_id=data.get("admission"),
            emergency_visit_id=data.get("emergency_visit"), requested_by=request.user,
        )
        if booking.theatre:
            booking.status = BookingStatus.CONFIRMED
            booking.save(update_fields=["status"])

        return Response(SurgeryBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED):
            raise ValidationError({"detail": "This booking is already closed."})
        serializer = CancelBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = serializer.validated_data["cancellation_reason"]
        booking.save(update_fields=["status", "cancellation_reason"])
        return Response(SurgeryBookingSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="start-surgery")
    def start_surgery(self, request, pk=None):
        booking = self.get_object()
        if booking.status not in (BookingStatus.REQUESTED, BookingStatus.CONFIRMED):
            raise ValidationError({"detail": "This booking cannot be started."})
        if hasattr(booking, "surgery"):
            raise ValidationError({"detail": "Surgery has already been started for this booking."})

        serializer = StartSurgerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        theatre = OperatingTheatre.objects.filter(pk=serializer.validated_data["theatre"], is_active=True).first()
        if not theatre:
            raise ValidationError({"theatre": "Theatre not found."})
        if theatre.status != TheatreStatus.AVAILABLE:
            raise ValidationError({"theatre": "This theatre is not currently available."})

        with transaction.atomic():
            surgery = Surgery.objects.create(booking=booking, theatre=theatre)
            booking.theatre = theatre
            booking.status = BookingStatus.IN_PROGRESS
            booking.save(update_fields=["theatre", "status"])
            theatre.status = TheatreStatus.IN_USE
            theatre.save(update_fields=["status"])

            if booking.primary_surgeon:
                SurgicalTeamMember.objects.create(
                    surgery=surgery, user=booking.primary_surgeon, role="PRIMARY_SURGEON",
                )

        return Response(SurgeryBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        qs = self.get_queryset().filter(status__in=[BookingStatus.REQUESTED, BookingStatus.CONFIRMED]).order_by("requested_date")
        return Response(SurgeryBookingListSerializer(qs, many=True).data)


class SurgeryViewSet(BaseModelViewSet):
    queryset = Surgery.objects.select_related("booking__patient", "booking__procedure", "theatre").prefetch_related(
        "team", "consumables_used", "post_op_notes"
    ).all()
    serializer_class = SurgerySerializer
    filterset_fields = ["status", "theatre"]
    http_method_names = ["get", "post", "head", "options"]  # created only via SurgeryBookingViewSet.start_surgery

    @action(detail=True, methods=["post"], url_path="mark-incision")
    def mark_incision(self, request, pk=None):
        surgery = self.get_object()
        surgery.incision_at = timezone.now()
        surgery.save(update_fields=["incision_at"])
        return Response(SurgerySerializer(surgery).data)

    @action(detail=True, methods=["post"], url_path="mark-closure")
    def mark_closure(self, request, pk=None):
        surgery = self.get_object()
        surgery.closure_at = timezone.now()
        surgery.save(update_fields=["closure_at"])
        return Response(SurgerySerializer(surgery).data)

    @action(detail=True, methods=["post"], url_path="assign-team")
    def assign_team(self, request, pk=None):
        surgery = self.get_object()
        serializer = AssignTeamMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        member, _ = SurgicalTeamMember.objects.get_or_create(
            surgery=surgery, user_id=data["user"], role=data["role"],
            defaults={"fee": data.get("fee", 0)},
        )
        return Response(SurgicalTeamMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="record-consumable")
    def record_consumable(self, request, pk=None):
        surgery = self.get_object()
        serializer = RecordConsumableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from api.models import Medicine
        medicine = Medicine.objects.filter(pk=data["medicine"]).first()
        if not medicine:
            raise ValidationError({"medicine": "Medicine not found."})

        batch = (
            MedicineBatch.objects.filter(medicine=medicine, quantity_remaining__gte=data["quantity"])
            .order_by("expiry_date").first()
        )
        if not batch:
            raise OutOfStockError(f"{medicine.name} is out of stock.")

        with transaction.atomic():
            usage = ConsumableUsage.objects.create(
                surgery=surgery, medicine=medicine, batch=batch,
                quantity=data["quantity"], recorded_by=request.user,
            )
            batch.quantity_remaining -= data["quantity"]
            batch.save(update_fields=["quantity_remaining"])
            StockTransaction.objects.create(
                medicine=medicine, batch=batch, transaction_type=StockTransactionType.STOCK_OUT,
                quantity=data["quantity"], reason=f"Theatre usage - {surgery.booking.booking_number}",
                performed_by=request.user,
            )
            invoice = raise_theatre_invoice(
                surgery.booking.patient,
                f"Theatre Consumable - {medicine.name} x{data['quantity']} ({surgery.booking.booking_number})",
                medicine.unit_price * data["quantity"], user=request.user,
            )
            usage.invoice = invoice
            usage.save(update_fields=["invoice"])

        return Response(ConsumableUsageSerializer(usage).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-post-op-note")
    def add_post_op_note(self, request, pk=None):
        surgery = self.get_object()
        serializer = PostOpNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(surgery=surgery, recorded_by=request.user)
        return Response(PostOpNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        surgery = self.get_object()
        if surgery.status != SurgeryStatus.IN_PROGRESS:
            raise ValidationError({"detail": "This surgery is already closed."})

        serializer = CompleteSurgerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            surgery.theatre_out_at = timezone.now()
            surgery.status = SurgeryStatus.ABANDONED if data["outcome"] == "DECEASED" and data.get("complications") == "ABANDONED" else SurgeryStatus.COMPLETED
            surgery.status = SurgeryStatus.COMPLETED
            surgery.outcome = data["outcome"]
            surgery.operative_notes = data.get("operative_notes", "")
            surgery.complications = data.get("complications", "")
            surgery.estimated_blood_loss_ml = data.get("estimated_blood_loss_ml")
            surgery.save(update_fields=[
                "theatre_out_at", "status", "outcome", "operative_notes",
                "complications", "estimated_blood_loss_ml",
            ])

            booking = surgery.booking
            booking.status = BookingStatus.COMPLETED
            booking.save(update_fields=["status"])

            time_charge = compute_theatre_time_charge(surgery)
            invoice = raise_theatre_invoice(
                booking.patient,
                f"Theatre Time - {surgery.theatre.theatre_number} ({surgery.duration_hours}h) + {booking.procedure.name}",
                float(booking.procedure.base_price) + time_charge, user=request.user,
            )
            surgery.invoice = invoice
            surgery.save(update_fields=["invoice"])

            for member in surgery.team.filter(fee__gt=0):
                raise_theatre_invoice(
                    booking.patient,
                    f"Surgical Fee - {member.get_role_display()} ({booking.booking_number})",
                    member.fee, user=request.user,
                )

            surgery.theatre.status = TheatreStatus.AVAILABLE
            surgery.theatre.save(update_fields=["status"])

        return Response(SurgerySerializer(surgery).data)

    @action(detail=False, methods=["get"], url_path="in-progress")
    def in_progress(self, request):
        qs = self.get_queryset().filter(status=SurgeryStatus.IN_PROGRESS)
        return Response(SurgerySerializer(qs, many=True).data)