from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    DentalProcedureCatalog, DentalVisit, ToothChart, DentalTreatmentPlan,
    TreatmentPlanStatus, DentalProcedureRecord,
)
from .serializers import (
    DentalProcedureCatalogSerializer, DentalVisitSerializer, DentalVisitListSerializer,
    RegisterDentalVisitSerializer, ToothChartSerializer, RecordToothSerializer,
    DentalTreatmentPlanSerializer, AddTreatmentPlanSerializer,
    DentalProcedureRecordSerializer, PerformProcedureSerializer,
)
from .services import ensure_dental_visit, raise_dental_invoice


class DentalProcedureCatalogViewSet(BaseModelViewSet):
    queryset = DentalProcedureCatalog.objects.filter(is_active=True)
    serializer_class = DentalProcedureCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class DentalVisitViewSet(BaseModelViewSet):
    queryset = DentalVisit.objects.select_related("patient", "dentist").prefetch_related("tooth_chart", "treatment_plans").all()
    search_fields = ["visit_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return DentalVisitListSerializer
        return DentalVisitSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterDentalVisitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        with transaction.atomic():
            visit = ensure_dental_visit(patient, registered_by=request.user)
            dental_visit = DentalVisit.objects.create(
                patient=patient, visit=visit, dentist_id=data.get("dentist"),
                chief_complaint=data.get("chief_complaint", ""), registered_by=request.user,
            )

        return Response(DentalVisitSerializer(dental_visit).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="record-tooth")
    def record_tooth(self, request, pk=None):
        dental_visit = self.get_object()
        serializer = RecordToothSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tooth, _ = ToothChart.objects.update_or_create(
            dental_visit=dental_visit, tooth_number=data["tooth_number"],
            defaults={"condition": data["condition"], "notes": data.get("notes", ""), "recorded_by": request.user},
        )
        return Response(ToothChartSerializer(tooth).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-treatment-plan")
    def add_treatment_plan(self, request, pk=None):
        dental_visit = self.get_object()
        serializer = AddTreatmentPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = DentalTreatmentPlan.objects.create(
            dental_visit=dental_visit, tooth_number=data.get("tooth_number", ""),
            procedure_id=data["procedure"], sequence=data.get("sequence", 1),
            notes=data.get("notes", ""), planned_by=request.user,
        )
        return Response(DentalTreatmentPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class DentalTreatmentPlanViewSet(BaseModelViewSet):
    queryset = DentalTreatmentPlan.objects.select_related("dental_visit__patient", "procedure").all()
    serializer_class = DentalTreatmentPlanSerializer
    filterset_fields = ["dental_visit", "status"]
    http_method_names = ["get", "post", "head", "options"]  # created only via DentalVisitViewSet.add_treatment_plan

    @action(detail=True, methods=["post"], url_path="perform")
    def perform(self, request, pk=None):
        """Marks a planned procedure as performed and bills it immediately."""
        plan = self.get_object()
        if plan.status == TreatmentPlanStatus.COMPLETED:
            raise ValidationError({"detail": "This procedure has already been performed."})
        if hasattr(plan, "procedure_record"):
            raise ValidationError({"detail": "A procedure record already exists for this plan item."})

        serializer = PerformProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dental_visit = plan.dental_visit
        with transaction.atomic():
            visit = dental_visit.visit or ensure_dental_visit(dental_visit.patient, registered_by=request.user)
            if not dental_visit.visit:
                dental_visit.visit = visit
                dental_visit.save(update_fields=["visit"])

            invoice = raise_dental_invoice(
                dental_visit.patient, visit,
                f"Dental - {plan.procedure.name}" + (f" (Tooth {plan.tooth_number})" if plan.tooth_number else "") +
                f" ({dental_visit.visit_number})",
                plan.procedure.price,
            )
            record = DentalProcedureRecord.objects.create(
                treatment_plan=plan, performed_by=request.user,
                notes=serializer.validated_data.get("notes", ""), invoice=invoice,
            )
            plan.status = TreatmentPlanStatus.COMPLETED
            plan.save(update_fields=["status"])

        return Response(DentalProcedureRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        plan = self.get_object()
        if plan.status == TreatmentPlanStatus.COMPLETED:
            raise ValidationError({"detail": "Cannot cancel a completed procedure."})
        plan.status = TreatmentPlanStatus.CANCELLED
        plan.save(update_fields=["status"])
        return Response(DentalTreatmentPlanSerializer(plan).data)