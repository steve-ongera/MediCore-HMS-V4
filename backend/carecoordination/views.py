from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.models import Patient, Role
from api.permissions import HasRole

from .models import CarePlan, CarePlanStatus, FollowUpTask, FollowUpStatus, CareMilestone, ChronicMonitoringReading
from .serializers import (
    CarePlanSerializer, CarePlanListSerializer, CreateCarePlanSerializer,
    FollowUpTaskSerializer, CreateFollowUpTaskSerializer, CompleteTaskSerializer, MarkMissedSerializer,
    CareMilestoneSerializer, AddMilestoneSerializer, ChronicMonitoringReadingSerializer, AddReadingSerializer,
)
from .services import refresh_task_statuses, send_pending_reminders


class IsClinicalOrHIMStaff(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.DOCTOR, Role.NURSE, Role.HEALTH_RECORDS_OFFICER, Role.MEDICAL_RECORDS_OFFICER, Role.SUPER_ADMIN]
        return super().has_permission(request, view)


class CarePlanViewSet(viewsets.ModelViewSet):
    queryset = CarePlan.objects.select_related("patient", "responsible_doctor", "created_by").prefetch_related(
        "tasks", "milestones", "monitoring_readings"
    ).all()
    permission_classes = [IsClinicalOrHIMStaff]
    filterset_fields = ["status", "is_chronic", "source_type"]
    search_fields = ["title", "condition", "patient__full_name", "patient__hospital_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return CarePlanListSerializer if self.action == "list" else CarePlanSerializer

    def create(self, request, *args, **kwargs):
        """
        Matches the exact workflow described: create the care plan AND the
        first follow-up task together, in one call — 'Create follow-up
        plan -> Review after 14 days -> Assign to clinic/doctor' as a
        single atomic action from the consultation/discharge screen.
        """
        serializer = CreateCarePlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        with transaction.atomic():
            plan = CarePlan.objects.create(
                patient=patient, title=data["title"], condition=data.get("condition", ""),
                icd10_code_id=data.get("icd10_code"), source_type=data["source_type"],
                source_consultation_id=data.get("source_consultation"),
                source_admission_id=data.get("source_admission"),
                source_emergency_visit_id=data.get("source_emergency_visit"),
                source_delivery_id=data.get("source_delivery"),
                source_referral_id=data.get("source_referral"),
                is_chronic=data.get("is_chronic", False), notes=data.get("notes", ""),
                responsible_doctor_id=data.get("responsible_doctor"),
                responsible_department_id=data.get("responsible_department"),
                created_by=request.user,
            )

            if data.get("first_task_description") and data.get("first_task_due_date"):
                FollowUpTask.objects.create(
                    care_plan=plan, task_type=data.get("first_task_type", "CLINIC_REVIEW"),
                    description=data["first_task_description"], due_date=data["first_task_due_date"],
                    assigned_to_id=data.get("responsible_doctor"),
                    assigned_department_id=data.get("responsible_department"),
                    created_by=request.user,
                )

        return Response(CarePlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-task")
    def add_task(self, request, pk=None):
        """Nurse sees previous care plan on patient return -> doctor adds a new task after reviewing progress — the recurring-loop part of the workflow."""
        plan = self.get_object()
        serializer = CreateFollowUpTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = FollowUpTask.objects.create(care_plan=plan, created_by=request.user, **serializer.validated_data)
        return Response(FollowUpTaskSerializer(task).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-milestone")
    def add_milestone(self, request, pk=None):
        plan = self.get_object()
        serializer = AddMilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        milestone = CareMilestone.objects.create(care_plan=plan, **serializer.validated_data)
        return Response(CareMilestoneSerializer(milestone).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-reading")
    def add_reading(self, request, pk=None):
        plan = self.get_object()
        serializer = AddReadingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reading = ChronicMonitoringReading.objects.create(care_plan=plan, recorded_by=request.user, **serializer.validated_data)
        return Response(ChronicMonitoringReadingSerializer(reading).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        plan = self.get_object()
        plan.status = CarePlanStatus.COMPLETED
        plan.closed_at = timezone.now()
        plan.save(update_fields=["status", "closed_at"])
        return Response(CarePlanSerializer(plan).data)

    @action(detail=False, methods=["get"], url_path="by-patient/(?P<patient_id>[^/.]+)")
    def by_patient(self, request, patient_id=None):
        """The nurse's 'sees previous care plan' view — every active/past care plan for a given patient, so context is never lost between visits."""
        qs = self.get_queryset().filter(patient_id=patient_id)
        return Response(CarePlanSerializer(qs, many=True).data)


class FollowUpTaskViewSet(viewsets.ModelViewSet):
    """
    The system-wide worklist — 'Follow-up tasks' and 'Escalation of missed
    follow-ups' from the requested feature list live here, cutting across
    every care plan and every department.
    """
    queryset = FollowUpTask.objects.select_related("care_plan__patient", "assigned_to", "assigned_department").all()
    serializer_class = FollowUpTaskSerializer
    permission_classes = [IsClinicalOrHIMStaff]
    filterset_fields = ["status", "task_type", "assigned_to", "assigned_department"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in (Role.HEALTH_RECORDS_OFFICER, Role.MEDICAL_RECORDS_OFFICER, Role.SUPER_ADMIN):
            return qs  # coordination staff see everything, for outreach/escalation oversight
        return qs.filter(assigned_to=user) | qs.filter(care_plan__responsible_doctor=user)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status in (FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED):
            raise ValidationError({"detail": "This task is already closed."})

        serializer = CompleteTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task.status = FollowUpStatus.COMPLETED
        task.completed_at = timezone.now()
        task.completed_by = request.user
        task.outcome_notes = serializer.validated_data.get("outcome_notes", "")
        task.resulting_visit_id = serializer.validated_data.get("resulting_visit")
        task.save()
        return Response(FollowUpTaskSerializer(task).data)

    @action(detail=True, methods=["post"], url_path="mark-missed")
    def mark_missed(self, request, pk=None):
        """Explicit 'patient did not return' — distinct from the automatic OVERDUE status, this is a human confirming the patient genuinely missed it (vs. it just not being due-checked yet)."""
        task = self.get_object()
        serializer = MarkMissedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task.status = FollowUpStatus.MISSED
        task.outcome_notes = serializer.validated_data["outcome_notes"]
        task.save(update_fields=["status", "outcome_notes"])
        return Response(FollowUpTaskSerializer(task).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        task = self.get_object()
        task.status = FollowUpStatus.CANCELLED
        task.save(update_fields=["status"])
        return Response(FollowUpTaskSerializer(task).data)

    @action(detail=False, methods=["get"], url_path="my-tasks")
    def my_tasks(self, request):
        qs = FollowUpTask.objects.filter(assigned_to=request.user).exclude(
            status__in=[FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED, FollowUpStatus.MISSED]
        ).select_related("care_plan__patient")
        return Response(FollowUpTaskSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        qs = self.get_queryset().filter(status__in=[FollowUpStatus.OVERDUE, FollowUpStatus.ESCALATED])
        return Response(FollowUpTaskSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="due-today")
    def due_today(self, request):
        qs = self.get_queryset().filter(status=FollowUpStatus.DUE_TODAY)
        return Response(FollowUpTaskSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """Summary counts for the module's landing page."""
        from django.db.models import Count
        qs = self.get_queryset()
        by_status = list(qs.values("status").annotate(count=Count("id")))
        return Response({
            "due_today": qs.filter(status=FollowUpStatus.DUE_TODAY).count(),
            "overdue": qs.filter(status=FollowUpStatus.OVERDUE).count(),
            "escalated": qs.filter(status=FollowUpStatus.ESCALATED).count(),
            "missed_this_month": qs.filter(status=FollowUpStatus.MISSED).count(),
            "by_status": [{"name": r["status"], "value": r["count"]} for r in by_status],
        })