from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import MethodNotAllowed

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    AntenatalProfile, ANCVisit, DeliveryRecord, Child, PostnatalVisit,
    VaccineCatalog, ChildImmunization, GrowthMonitoring,
    PregnancyStatus, ImmunizationStatus,DeliveryCharge,
)
from .serializers import (
    AntenatalProfileSerializer, AntenatalProfileListSerializer, RegisterANCSerializer,
    ANCVisitSerializer, DeliveryRecordSerializer, RecordDeliverySerializer,
    ChildSerializer, ChildListSerializer, PostnatalVisitSerializer,
    VaccineCatalogSerializer, ChildImmunizationSerializer, GrowthMonitoringSerializer,
    AddChargeSerializer, DeliveryChargeSerializer,
)

from api.models import Patient, Invoice
from api.serializers import InvoiceSerializer
from .serializers import AddChargeSerializer

from .services import ensure_mch_visit, raise_mch_invoice, schedule_immunizations_for_child

# Flat facility fees for now — move to a configurable fee schedule later if needed.
ANC_VISIT_FEE = 500
PNC_VISIT_FEE = 300
DELIVERY_FEE = 8000


# Add this import at the top of views.py, alongside your other imports:
# from api.models import Patient, Invoice
# from api.serializers import InvoiceSerializer
# (adjust the module paths to match wherever Invoice / InvoiceSerializer
#  actually live in your api app — same place AdmissionViewSet.billing gets them)

class AntenatalProfileViewSet(BaseModelViewSet):
    queryset = AntenatalProfile.objects.select_related("mother").all()
    filterset_fields = ["status", "high_risk"]
    search_fields = ["anc_number", "mother__full_name", "mother__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return AntenatalProfileListSerializer
        return AntenatalProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterANCSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        mother = Patient.objects.filter(pk=data["mother"]).first()
        if not mother:
            raise ValidationError({"mother": "Patient not found."})

        with transaction.atomic():
            visit = ensure_mch_visit(mother, registered_by=request.user)
            profile = AntenatalProfile.objects.create(
                mother=mother,
                gravida=data["gravida"],
                para=data["para"],
                lmp=data["lmp"],
                blood_group=data.get("blood_group", "UNKNOWN"),
                height_cm=data.get("height_cm"),
                booking_weight_kg=data.get("booking_weight_kg"),
                hiv_status=data.get("hiv_status", "UNKNOWN"),
                high_risk=data.get("high_risk", False),
                risk_factors=data.get("risk_factors", ""),
                registered_by=request.user,
                visit=visit,
            )
            raise_mch_invoice(mother, visit, f"ANC Booking - {profile.anc_number}", ANC_VISIT_FEE)

        return Response(AntenatalProfileSerializer(profile).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="record-delivery")
    def record_delivery(self, request, pk=None):
        profile = self.get_object()
        serializer = RecordDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            mch_visit = profile.visit or ensure_mch_visit(profile.mother, registered_by=request.user)

            delivery = DeliveryRecord.objects.create(
                profile=profile,
                delivery_date=data["delivery_date"],
                mode_of_delivery=data["mode_of_delivery"],
                outcome=data["outcome"],
                place_of_delivery=data.get("place_of_delivery", "Facility"),
                complications=data.get("complications", ""),
                blood_loss_ml=data.get("blood_loss_ml"),
                admission_id=data.get("admission"),
                attended_by=request.user,
            )
            invoice = raise_mch_invoice(
                profile.mother, mch_visit,
                f"Delivery - {delivery.delivery_number} ({data['mode_of_delivery']})", DELIVERY_FEE,
            )
            delivery.invoice = invoice
            delivery.save(update_fields=["invoice"])
            
            DeliveryCharge.objects.create(
                delivery=delivery, invoice=invoice,
                description=f"Delivery Fee - {data['mode_of_delivery']}",
                added_by=request.user,
            )

            child = None
            if data["outcome"] == "LIVE_BIRTH":
                child = Child.objects.create(
                    mother=profile.mother,
                    delivery=delivery,
                    full_name=data.get("child_full_name", ""),
                    sex=data.get("child_sex", "MALE"),
                    date_of_birth=data["delivery_date"].date(),
                    birth_weight_kg=data.get("birth_weight_kg"),
                    birth_length_cm=data.get("birth_length_cm"),
                    apgar_score_1min=data.get("apgar_score_1min"),
                    apgar_score_5min=data.get("apgar_score_5min"),
                    registered_by=request.user,
                )
                schedule_immunizations_for_child(child)

            profile.status = PregnancyStatus.DELIVERED
            profile.save(update_fields=["status"])

        response_data = DeliveryRecordSerializer(delivery).data
        if child:
            response_data["child"] = ChildSerializer(child).data
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="billing")
    def billing(self, request, pk=None):
        """
        Consolidated bill for this mother's MCH care — ANC visits, deliveries,
        PNC visits, immunizations, and any manually added charges — all raised
        against the same shared MCH Visit. Same pattern as AdmissionViewSet.billing.
        """
        profile = self.get_object()

        if not profile.visit:
            with transaction.atomic():
                profile.visit = ensure_mch_visit(profile.mother, registered_by=request.user)
                profile.save(update_fields=["visit"])

        invoices = Invoice.objects.filter(visit=profile.visit).order_by("created_at")

        breakdown = {}
        grand_total = 0
        amount_paid = 0
        for inv in invoices:
            bucket = breakdown.setdefault(inv.source_type, {"count": 0, "total": 0, "paid": 0})
            bucket["count"] += 1
            bucket["total"] += inv.amount
            bucket["paid"] += inv.amount_paid
            grand_total += inv.amount
            amount_paid += inv.amount_paid

        return Response({
            "anc_number": profile.anc_number,
            "mother_name": profile.mother.full_name,
            "visit_number": profile.visit.visit_number,
            "invoices": InvoiceSerializer(invoices, many=True).data,
            "breakdown": {
                k: {"count": v["count"], "total": str(v["total"]), "paid": str(v["paid"])}
                for k, v in breakdown.items()
            },
            "grand_total": str(grand_total),
            "amount_paid": str(amount_paid),
            "balance": str(grand_total - amount_paid),
        })

    @action(detail=True, methods=["post"], url_path="add-charge")
    def add_charge(self, request, pk=None):
        """
        Ad-hoc billing for anything that doesn't fit a fixed catalog item —
        e.g. an ultrasound scan, a specialist review fee, extra consumables.
        Raised against the same shared MCH Visit as every automated charge,
        so it shows up in this profile's billing and in Billing/Payments
        exactly like everything else.
        """
        profile = self.get_object()
        serializer = AddChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            visit = profile.visit or ensure_mch_visit(profile.mother, registered_by=request.user)
            if not profile.visit:
                profile.visit = visit
                profile.save(update_fields=["visit"])

            invoice = raise_mch_invoice(
                profile.mother, visit,
                serializer.validated_data["description"],
                serializer.validated_data["amount"],
            )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
    
    
class ANCVisitViewSet(BaseModelViewSet):
    queryset = ANCVisit.objects.select_related("profile__mother").all()
    serializer_class = ANCVisitSerializer
    filterset_fields = ["profile"]

    def perform_create(self, serializer):
        profile = serializer.validated_data["profile"]
        visit_number = ANCVisit.objects.filter(profile=profile).count() + 1
        with transaction.atomic():
            mch_visit = profile.visit or ensure_mch_visit(profile.mother, registered_by=self.request.user)
            anc_visit = serializer.save(attended_by=self.request.user, visit_number=visit_number)
            invoice = raise_mch_invoice(profile.mother, mch_visit, f"ANC Visit #{visit_number} - {profile.anc_number}", ANC_VISIT_FEE)
            anc_visit.invoice = invoice
            anc_visit.save(update_fields=["invoice"])



class DeliveryRecordViewSet(BaseModelViewSet):
    queryset = DeliveryRecord.objects.select_related("profile__mother").prefetch_related("charges__invoice").all()
    serializer_class = DeliveryRecordSerializer
    filterset_fields = ["profile", "mode_of_delivery", "outcome"]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Delivery records are created only via AntenatalProfile.record-delivery.")

    @action(detail=True, methods=["post"], url_path="add-charge")
    def add_charge(self, request, pk=None):
        """
        Ad-hoc billing scoped to a specific delivery — e.g. surgical
        consumables for a C-section, blood transfusion, extended theatre
        time. Raised against the same shared MCH Visit as every other
        charge for this pregnancy, with the delivery number folded into the
        description for a clean audit trail on the bill.
        """
        delivery = self.get_object()
        serializer = AddChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = delivery.profile
        with transaction.atomic():
            visit = profile.visit or ensure_mch_visit(profile.mother, registered_by=request.user)
            if not profile.visit:
                profile.visit = visit
                profile.save(update_fields=["visit"])

            description = serializer.validated_data["description"]
            invoice = raise_mch_invoice(
                profile.mother, visit,
                f"{description} ({delivery.delivery_number})",
                serializer.validated_data["amount"],
            )

            charge = DeliveryCharge.objects.create(
                delivery=delivery, invoice=invoice,
                description=description, added_by=request.user,
            )

        return Response(
            DeliveryChargeSerializer(charge).data,
            status=status.HTTP_201_CREATED,
        )
        
        
class PostnatalVisitViewSet(BaseModelViewSet):
    queryset = PostnatalVisit.objects.select_related("profile__mother", "child").all()
    serializer_class = PostnatalVisitSerializer
    filterset_fields = ["profile", "child"]

    def perform_create(self, serializer):
        profile = serializer.validated_data["profile"]
        with transaction.atomic():
            mch_visit = profile.visit or ensure_mch_visit(profile.mother, registered_by=self.request.user)
            pnc_visit = serializer.save(attended_by=self.request.user)
            invoice = raise_mch_invoice(profile.mother, mch_visit, f"PNC Visit Day {pnc_visit.visit_day} - {profile.anc_number}", PNC_VISIT_FEE)
            pnc_visit.invoice = invoice
            pnc_visit.save(update_fields=["invoice"])


class ChildViewSet(BaseModelViewSet):
    queryset = Child.objects.select_related("mother", "delivery").all()
    search_fields = ["child_number", "full_name", "mother__full_name"]

    def get_serializer_class(self):
        if self.action == "list":
            return ChildListSerializer
        return ChildSerializer

    def perform_create(self, serializer):
        child = serializer.save(registered_by=self.request.user)
        schedule_immunizations_for_child(child)


class VaccineCatalogViewSet(BaseModelViewSet):
    queryset = VaccineCatalog.objects.filter(is_active=True)
    serializer_class = VaccineCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class ChildImmunizationViewSet(BaseModelViewSet):
    queryset = ChildImmunization.objects.select_related("vaccine", "child").all()
    serializer_class = ChildImmunizationSerializer
    filterset_fields = ["child", "status"]

    @action(detail=True, methods=["post"], url_path="administer")
    def administer(self, request, pk=None):
        immunization = self.get_object()
        if immunization.status == ImmunizationStatus.GIVEN:
            raise ValidationError({"detail": "This vaccine has already been given."})

        batch_number = request.data.get("batch_number", "")

        with transaction.atomic():
            immunization.status = ImmunizationStatus.GIVEN
            immunization.given_date = timezone.now().date()
            immunization.batch_number = batch_number
            immunization.administered_by = request.user

            if immunization.vaccine.price and immunization.vaccine.price > 0:
                mch_visit = ensure_mch_visit(immunization.child.mother, registered_by=request.user)
                invoice = raise_mch_invoice(
                    immunization.child.mother, mch_visit,
                    f"Immunization - {immunization.vaccine.name} ({immunization.child.child_number})",
                    immunization.vaccine.price,
                )
                immunization.invoice = invoice

            immunization.save(update_fields=["status", "given_date", "batch_number", "administered_by", "invoice"])

        return Response(ChildImmunizationSerializer(immunization).data)

    @action(detail=False, methods=["get"], url_path="due")
    def due(self, request):
        qs = self.get_queryset().filter(status=ImmunizationStatus.DUE, due_date__lte=timezone.now().date())
        return Response(ChildImmunizationSerializer(qs, many=True).data)


class GrowthMonitoringViewSet(BaseModelViewSet):
    queryset = GrowthMonitoring.objects.select_related("child").all()
    serializer_class = GrowthMonitoringSerializer
    filterset_fields = ["child"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)