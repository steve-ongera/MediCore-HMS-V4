from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient, Invoice
from api.serializers import InvoiceSerializer
from api.permissions import ReadOnlyOrSuperAdmin
from api.permissions import IsMortuaryStaff, IsMortuaryAttendant

from .models import (
    MortuaryUnit, CompartmentStatus, MortuaryAdmission, MortuaryStatus,
    MortuaryServiceCatalog, MortuaryServiceRecord, MortuaryServiceStatus, BodyRelease,
)
from .serializers import (
    MortuaryUnitSerializer, MortuaryAdmissionSerializer, MortuaryAdmissionListSerializer,
    RegisterMortuaryCaseSerializer, MortuaryServiceCatalogSerializer, MortuaryServiceRecordSerializer,
    OrderMortuaryServiceSerializer, BodyReleaseSerializer, ReleaseBodySerializer,
    AddMortuaryChargeSerializer,
)
from .services import raise_mortuary_invoice, charge_storage_to_date, ensure_mortuary_visit


class MortuaryUnitViewSet(BaseModelViewSet):
    permission_classes = [IsMortuaryStaff]
    queryset = MortuaryUnit.objects.filter(is_active=True)
    serializer_class = MortuaryUnitSerializer
    filterset_fields = ["status"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=CompartmentStatus.AVAILABLE)
        return Response(MortuaryUnitSerializer(qs, many=True).data)


class MortuaryServiceCatalogViewSet(BaseModelViewSet):
    queryset = MortuaryServiceCatalog.objects.filter(is_active=True)
    serializer_class = MortuaryServiceCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class MortuaryAdmissionViewSet(BaseModelViewSet):
    permission_classes = [IsMortuaryStaff]
    queryset = MortuaryAdmission.objects.select_related("patient", "compartment").all()
    filterset_fields = ["status", "source"]
    search_fields = ["case_number", "patient__full_name", "deceased_name_freetext"]

    def get_serializer_class(self):
        if self.action == "list":
            return MortuaryAdmissionListSerializer
        return MortuaryAdmissionSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterMortuaryCaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = None
        if data.get("patient"):
            patient = Patient.objects.filter(pk=data["patient"]).first()
            if not patient:
                raise ValidationError({"patient": "Patient not found."})

        compartment = None
        if data.get("compartment"):
            compartment = MortuaryUnit.objects.filter(pk=data["compartment"], is_active=True).first()
            if not compartment:
                raise ValidationError({"compartment": "Compartment not found."})
            if compartment.status != CompartmentStatus.AVAILABLE:
                raise ValidationError({"compartment": "This compartment is not available."})

        with transaction.atomic():
            case = MortuaryAdmission.objects.create(
                patient=patient,
                deceased_name_freetext=data.get("deceased_name_freetext", ""),
                gender=data.get("gender", "UNKNOWN"),
                estimated_age=data.get("estimated_age"),
                date_of_death=data["date_of_death"],
                cause_of_death=data.get("cause_of_death", ""),
                source=data["source"],
                admission_id=data.get("admission"),
                emergency_visit_id=data.get("emergency_visit"),
                delivery_record_id=data.get("delivery_record"),
                compartment=compartment,
                brought_by=data.get("brought_by", ""),
                police_ob_number=data.get("police_ob_number", ""),
                admitted_by=request.user,
            )
            if compartment:
                compartment.status = CompartmentStatus.OCCUPIED
                compartment.save(update_fields=["status"])

            # First day's storage charged immediately, matching the
            # inpatient bed-charge-on-admission pattern.
            charge_storage_to_date(case, user=request.user)

        return Response(MortuaryAdmissionSerializer(case).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="billing")
    def billing(self, request, pk=None):
        case = self.get_object()
        charge_storage_to_date(case, user=request.user)  # top up storage charges to today before showing the bill

        invoices = Invoice.objects.filter(mortuary_charges__mortuary_case=case).distinct().order_by("created_at")
        grand_total = sum((inv.amount for inv in invoices), start=0)
        amount_paid = sum((inv.amount_paid for inv in invoices), start=0)

        return Response({
            "case_number": case.case_number,
            "deceased_name": case.deceased_display_name,
            "invoices": InvoiceSerializer(invoices, many=True).data,
            "grand_total": str(grand_total),
            "amount_paid": str(amount_paid),
            "balance": str(grand_total - amount_paid),
        })

    @action(detail=True, methods=["post"], url_path="add-charge")
    def add_charge(self, request, pk=None):
        case = self.get_object()
        serializer = AddMortuaryChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = raise_mortuary_invoice(
            case, f"{serializer.validated_data['description']} ({case.case_number})",
            serializer.validated_data["amount"], user=request.user,
        )
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="order-service")
    def order_service(self, request, pk=None):
        case = self.get_object()
        serializer = OrderMortuaryServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = MortuaryServiceCatalog.objects.filter(pk=serializer.validated_data["service"], is_active=True).first()
        if not service:
            raise ValidationError({"service": "Service not found."})

        with transaction.atomic():
            record = MortuaryServiceRecord.objects.create(
                mortuary_case=case, service=service,
                notes=serializer.validated_data.get("notes", ""), ordered_by=request.user,
            )
            invoice = raise_mortuary_invoice(
                case, f"Service - {service.name} ({case.case_number})", service.price, user=request.user,
            )
            record.invoice = invoice
            record.save(update_fields=["invoice"])

        return Response(MortuaryServiceRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="release")
    def release(self, request, pk=None):
        case = self.get_object()
        if case.status != MortuaryStatus.ADMITTED:
            raise ValidationError({"detail": "This case has already been released."})
        if hasattr(case, "release"):
            raise ValidationError({"detail": "A release record already exists for this case."})

        serializer = ReleaseBodySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            charge_storage_to_date(case, user=request.user)  # final storage charge up to release moment

            BodyRelease.objects.create(
                mortuary_case=case,
                collector_name=data["collector_name"],
                collector_id_number=data.get("collector_id_number", ""),
                collector_phone=data.get("collector_phone", ""),
                relationship=data["relationship"],
                funeral_home=data.get("funeral_home", ""),
                burial_permit_number=data.get("burial_permit_number", ""),
                notes=data.get("notes", ""),
                released_by=request.user,
            )
            case.status = MortuaryStatus.RELEASED
            case.save(update_fields=["status"])

            if case.compartment:
                case.compartment.status = CompartmentStatus.AVAILABLE
                case.compartment.save(update_fields=["status"])

        return Response(MortuaryAdmissionSerializer(case).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="in-storage")
    def in_storage(self, request):
        qs = self.get_queryset().filter(status=MortuaryStatus.ADMITTED)
        return Response(MortuaryAdmissionListSerializer(qs, many=True).data)