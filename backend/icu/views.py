from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from inpatient.models import Admission

from .models import (
    ICUBed, ICUBedStatus, ICUAdmission, ICUAdmissionStatus,
    ICUVitalsMonitoring, VentilatorSettings, ICUProcedureCatalog, ICUProcedureRecord,
)
from .serializers import (
    ICUBedSerializer, ICUAdmissionSerializer, ICUAdmissionListSerializer,
    AdmitToICUSerializer, DischargeICUSerializer, ICUVitalsMonitoringSerializer,
    VentilatorSettingsSerializer, ICUProcedureCatalogSerializer, ICUProcedureRecordSerializer,
    OrderICUProcedureSerializer,
)
from .services import raise_icu_invoice, charge_icu_bed_day


class ICUBedViewSet(BaseModelViewSet):
    queryset = ICUBed.objects.filter(is_active=True)
    serializer_class = ICUBedSerializer
    filterset_fields = ["unit_type", "status"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=ICUBedStatus.AVAILABLE)
        return Response(ICUBedSerializer(qs, many=True).data)


class ICUProcedureCatalogViewSet(BaseModelViewSet):
    queryset = ICUProcedureCatalog.objects.filter(is_active=True)
    serializer_class = ICUProcedureCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class ICUAdmissionViewSet(BaseModelViewSet):
    queryset = ICUAdmission.objects.select_related("patient", "bed", "attending_physician").all()
    filterset_fields = ["status", "admission_reason", "bed"]
    search_fields = ["icu_admission_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return ICUAdmissionListSerializer
        return ICUAdmissionSerializer

    def create(self, request, *args, **kwargs):
        serializer = AdmitToICUSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        bed = ICUBed.objects.filter(pk=data["bed"], is_active=True).first()
        if not bed:
            raise ValidationError({"bed": "Bed not found."})
        if bed.status != ICUBedStatus.AVAILABLE:
            raise ValidationError({"bed": "This bed is not available."})

        if data.get("ward_admission"):
            ward_admission = Admission.objects.filter(pk=data["ward_admission"]).first()
            if not ward_admission:
                raise ValidationError({"ward_admission": "Ward admission not found."})

        with transaction.atomic():
            icu_admission = ICUAdmission.objects.create(
                patient=patient, ward_admission_id=data.get("ward_admission"), bed=bed,
                admission_reason=data["admission_reason"], admission_diagnosis=data.get("admission_diagnosis", ""),
                severity_score=data.get("severity_score"), attending_physician_id=data.get("attending_physician"),
                admitted_by=request.user,
            )
            bed.status = ICUBedStatus.OCCUPIED
            bed.save(update_fields=["status"])

            # First day's bed charge immediately, same as inpatient bed charging.
            charge_icu_bed_day(icu_admission, user=request.user)

        return Response(ICUAdmissionSerializer(icu_admission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="discharge")
    def discharge(self, request, pk=None):
        icu_admission = self.get_object()
        if icu_admission.status != ICUAdmissionStatus.ADMITTED:
            raise ValidationError({"detail": "This ICU episode is already closed."})

        serializer = DischargeICUSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            charge_icu_bed_day(icu_admission, user=request.user)  # final day's charge before closing

            icu_admission.status = data["status"]
            icu_admission.discharge_summary = data.get("discharge_summary", "")
            icu_admission.discharged_at = timezone.now()
            icu_admission.save(update_fields=["status", "discharge_summary", "discharged_at"])

            icu_admission.bed.status = ICUBedStatus.AVAILABLE
            icu_admission.bed.save(update_fields=["status"])

        return Response(ICUAdmissionSerializer(icu_admission).data)

    @action(detail=True, methods=["post"], url_path="record-vitals")
    def record_vitals(self, request, pk=None):
        icu_admission = self.get_object()
        serializer = ICUVitalsMonitoringSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vitals = serializer.save(icu_admission=icu_admission, recorded_by=request.user)
        return Response(ICUVitalsMonitoringSerializer(vitals).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="record-ventilator-settings")
    def record_ventilator_settings(self, request, pk=None):
        icu_admission = self.get_object()
        serializer = VentilatorSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        settings = serializer.save(icu_admission=icu_admission, recorded_by=request.user)
        return Response(VentilatorSettingsSerializer(settings).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="order-procedure")
    def order_procedure(self, request, pk=None):
        icu_admission = self.get_object()
        serializer = OrderICUProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        procedure = ICUProcedureCatalog.objects.filter(pk=data["procedure"], is_active=True).first()
        if not procedure:
            raise ValidationError({"procedure": "Procedure not found."})

        with transaction.atomic():
            invoice = raise_icu_invoice(
                icu_admission.patient,
                f"ICU Procedure - {procedure.name} ({icu_admission.icu_admission_number})",
                procedure.price, user=request.user,
            )
            record = ICUProcedureRecord.objects.create(
                icu_admission=icu_admission, procedure=procedure, performed_by=request.user,
                notes=data.get("notes", ""), invoice=invoice,
            )

        return Response(ICUProcedureRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="billing")
    def billing(self, request, pk=None):
        from api.models import Invoice
        from api.serializers import InvoiceSerializer

        icu_admission = self.get_object()
        charge_icu_bed_day(icu_admission, user=request.user)  # top up to today

        invoices = Invoice.objects.filter(patient=icu_admission.patient, description__icontains=icu_admission.icu_admission_number)
        grand_total = sum((i.amount for i in invoices), start=0)
        amount_paid = sum((i.amount_paid for i in invoices), start=0)

        return Response({
            "icu_admission_number": icu_admission.icu_admission_number,
            "patient_name": icu_admission.patient.full_name,
            "invoices": InvoiceSerializer(invoices, many=True).data,
            "grand_total": str(grand_total),
            "amount_paid": str(amount_paid),
            "balance": str(grand_total - amount_paid),
        })

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(status=ICUAdmissionStatus.ADMITTED)
        return Response(ICUAdmissionListSerializer(qs, many=True).data)