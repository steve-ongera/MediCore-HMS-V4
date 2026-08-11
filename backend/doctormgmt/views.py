from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.permissions import HasRole
from api.models import Role, User

from .models import DoctorProfile, DoctorSchedule, DoctorHoliday, HolidayStatus, DoctorCommission, CommissionStatus
from .serializers import (
    DoctorProfileSerializer, DoctorProfileListSerializer, CreateDoctorProfileSerializer,
    DoctorScheduleSerializer, DoctorHolidaySerializer, DoctorCommissionSerializer,
)


class IsHROrSuperAdmin(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.HR_OFFICER, Role.SUPER_ADMIN]
        return super().has_permission(request, view)


class DoctorProfileViewSet(viewsets.ModelViewSet):
    queryset = DoctorProfile.objects.select_related("user", "user__department").prefetch_related("schedules", "holidays").all()
    permission_classes = [IsHROrSuperAdmin]
    search_fields = ["user__first_name", "user__last_name", "specialty", "license_number"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        return DoctorProfileListSerializer if self.action == "list" else DoctorProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateDoctorProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(pk=data["user"], role=Role.DOCTOR).first()
        if not user:
            raise ValidationError({"user": "User not found or is not a Doctor."})
        if hasattr(user, "doctor_profile"):
            raise ValidationError({"detail": "This doctor already has a profile."})

        profile = DoctorProfile.objects.create(user=user, **{k: v for k, v in data.items() if k != "user"})
        return Response(DoctorProfileSerializer(profile).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="treatment-history")
    def treatment_history(self, request, pk=None):
        """Reads real Consultation records for this doctor — no duplicate data, just a filtered view."""
        profile = self.get_object()
        from api.models import Consultation
        consultations = Consultation.objects.filter(doctor=profile.user).select_related("visit__patient").order_by("-started_at")[:200]
        history = [
            {
                "id": str(c.id), "patient_name": c.visit.patient.full_name,
                "chief_complaint": c.chief_complaint, "status": c.status,
                "started_at": c.started_at, "completed_at": c.completed_at,
            }
            for c in consultations
        ]
        return Response(history)

    @action(detail=True, methods=["get"], url_path="visits")
    def visits(self, request, pk=None):
        """Every visit routed to this doctor — 'Doctor Visits' from the reference."""
        profile = self.get_object()
        from api.models import Visit
        visits = Visit.objects.filter(doctor=profile.user).select_related("patient", "department").order_by("-visit_date")[:200]
        data = [
            {
                "id": str(v.id), "visit_number": v.visit_number, "patient_name": v.patient.full_name,
                "department_name": v.department.name if v.department else None,
                "status": v.status, "visit_date": v.visit_date,
            }
            for v in visits
        ]
        return Response(data)


class DoctorScheduleViewSet(viewsets.ModelViewSet):
    queryset = DoctorSchedule.objects.select_related("doctor__user", "department").all()
    serializer_class = DoctorScheduleSerializer
    permission_classes = [IsHROrSuperAdmin]
    filterset_fields = ["doctor", "day_of_week", "is_active"]

    @action(detail=False, methods=["get"], url_path="all")
    def all_schedules(self, request):
        qs = self.get_queryset().filter(is_active=True)
        return Response(DoctorScheduleSerializer(qs, many=True).data)


class DoctorHolidayViewSet(viewsets.ModelViewSet):
    queryset = DoctorHoliday.objects.select_related("doctor__user", "approved_by").all()
    serializer_class = DoctorHolidaySerializer
    permission_classes = [IsHROrSuperAdmin]
    filterset_fields = ["doctor", "status"]

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        holiday = self.get_object()
        holiday.status = HolidayStatus.APPROVED
        holiday.approved_by = request.user
        holiday.save(update_fields=["status", "approved_by"])
        return Response(DoctorHolidaySerializer(holiday).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        holiday = self.get_object()
        holiday.status = HolidayStatus.REJECTED
        holiday.approved_by = request.user
        holiday.save(update_fields=["status", "approved_by"])
        return Response(DoctorHolidaySerializer(holiday).data)


class DoctorCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only — commission records are created automatically by the system when consultations complete, not manually entered."""
    queryset = DoctorCommission.objects.select_related("doctor__user", "consultation").all()
    serializer_class = DoctorCommissionSerializer
    permission_classes = [IsHROrSuperAdmin]
    filterset_fields = ["doctor", "status", "period_month", "period_year"]

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        commission = self.get_object()
        from django.utils import timezone
        commission.status = CommissionStatus.PAID
        commission.paid_at = timezone.now()
        commission.save(update_fields=["status", "paid_at"])
        return Response(DoctorCommissionSerializer(commission).data)