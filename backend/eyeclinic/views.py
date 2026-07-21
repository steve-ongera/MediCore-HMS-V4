from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    EyeProcedureCatalog, EyeVisit, EyeExamination, SpectaclePrescription,
    EyeTreatmentPlan, EyeTreatmentPlanStatus, EyeProcedureRecord,
)
from .serializers import (
    EyeProcedureCatalogSerializer, EyeVisitSerializer, EyeVisitListSerializer,
    RegisterEyeVisitSerializer, EyeExaminationSerializer, SaveExaminationSerializer,
    SpectaclePrescriptionSerializer, CreateSpectaclePrescriptionSerializer,
    EyeTreatmentPlanSerializer, AddEyeTreatmentPlanSerializer,
    EyeProcedureRecordSerializer, PerformEyeProcedureSerializer,
)
from .services import ensure_eyeclinic_visit, raise_eyeclinic_invoice


class EyeProcedureCatalogViewSet(BaseModelViewSet):
    queryset = EyeProcedureCatalog.objects.filter(is_active=True)
    serializer_class = EyeProcedureCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class EyeVisitViewSet(BaseModelViewSet):
    queryset = EyeVisit.objects.select_related("patient", "ophthalmologist").prefetch_related(
        "spectacle_prescriptions", "treatment_plans"
    ).all()
    search_fields = ["visit_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return EyeVisitListSerializer
        return EyeVisitSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterEyeVisitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        with transaction.atomic():
            visit = ensure_eyeclinic_visit(patient, registered_by=request.user)
            eye_visit = EyeVisit.objects.create(
                patient=patient, visit=visit, ophthalmologist_id=data.get("ophthalmologist"),
                chief_complaint=data.get("chief_complaint", ""), registered_by=request.user,
            )

        return Response(EyeVisitSerializer(eye_visit).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="save-examination")
    def save_examination(self, request, pk=None):
        eye_visit = self.get_object()
        serializer = SaveExaminationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exam, _ = EyeExamination.objects.update_or_create(
            eye_visit=eye_visit,
            defaults={**serializer.validated_data, "examined_by": request.user},
        )
        return Response(EyeExaminationSerializer(exam).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="prescribe-spectacles")
    def prescribe_spectacles(self, request, pk=None):
        eye_visit = self.get_object()
        serializer = CreateSpectaclePrescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            visit = eye_visit.visit or ensure_eyeclinic_visit(eye_visit.patient, registered_by=request.user)
            if not eye_visit.visit:
                eye_visit.visit = visit
                eye_visit.save(update_fields=["visit"])

            prescription = SpectaclePrescription.objects.create(
                eye_visit=eye_visit, prescribed_by=request.user, **data,
            )
            if data.get("price", 0) > 0:
                invoice = raise_eyeclinic_invoice(
                    eye_visit.patient, visit,
                    f"Spectacle Prescription - {data['lens_type']} ({eye_visit.visit_number})",
                    data["price"],
                )
                prescription.invoice = invoice
                prescription.save(update_fields=["invoice"])

        return Response(SpectaclePrescriptionSerializer(prescription).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-treatment-plan")
    def add_treatment_plan(self, request, pk=None):
        eye_visit = self.get_object()
        serializer = AddEyeTreatmentPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = EyeTreatmentPlan.objects.create(
            eye_visit=eye_visit, procedure_id=data["procedure"], eye=data.get("eye", "BOTH"),
            notes=data.get("notes", ""), planned_by=request.user,
        )
        return Response(EyeTreatmentPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class EyeTreatmentPlanViewSet(BaseModelViewSet):
    queryset = EyeTreatmentPlan.objects.select_related("eye_visit__patient", "procedure").all()
    serializer_class = EyeTreatmentPlanSerializer
    filterset_fields = ["eye_visit", "status"]
    http_method_names = ["get", "post", "head", "options"]

    @action(detail=True, methods=["post"], url_path="perform")
    def perform(self, request, pk=None):
        plan = self.get_object()
        if plan.status == EyeTreatmentPlanStatus.COMPLETED:
            raise ValidationError({"detail": "This procedure has already been performed."})
        if hasattr(plan, "procedure_record"):
            raise ValidationError({"detail": "A procedure record already exists for this plan item."})

        serializer = PerformEyeProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        eye_visit = plan.eye_visit
        with transaction.atomic():
            visit = eye_visit.visit or ensure_eyeclinic_visit(eye_visit.patient, registered_by=request.user)
            if not eye_visit.visit:
                eye_visit.visit = visit
                eye_visit.save(update_fields=["visit"])

            invoice = raise_eyeclinic_invoice(
                eye_visit.patient, visit,
                f"Eye Clinic - {plan.procedure.name} ({plan.eye}) ({eye_visit.visit_number})",
                plan.procedure.price,
            )
            record = EyeProcedureRecord.objects.create(
                treatment_plan=plan, performed_by=request.user,
                notes=serializer.validated_data.get("notes", ""), invoice=invoice,
            )
            plan.status = EyeTreatmentPlanStatus.COMPLETED
            plan.save(update_fields=["status"])

        return Response(EyeProcedureRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        plan = self.get_object()
        if plan.status == EyeTreatmentPlanStatus.COMPLETED:
            raise ValidationError({"detail": "Cannot cancel a completed procedure."})
        plan.status = EyeTreatmentPlanStatus.CANCELLED
        plan.save(update_fields=["status"])
        return Response(EyeTreatmentPlanSerializer(plan).data)