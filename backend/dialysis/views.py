from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    DialysisMachine, MachineStatus, DialysisPatientProfile, DialysisPatientStatus,
    DialysisSession, SessionStatus, VascularAccessCheck,
)
from .serializers import (
    DialysisMachineSerializer, DialysisPatientProfileSerializer, DialysisPatientProfileListSerializer,
    RegisterDialysisPatientSerializer, DialysisSessionSerializer, DialysisSessionListSerializer,
    ScheduleSessionSerializer, StartSessionSerializer, CompleteSessionSerializer,
    VascularAccessCheckSerializer,
)
from .services import raise_dialysis_invoice, compute_session_charge


class DialysisMachineViewSet(BaseModelViewSet):
    queryset = DialysisMachine.objects.filter(is_active=True)
    serializer_class = DialysisMachineSerializer
    filterset_fields = ["status"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=MachineStatus.AVAILABLE)
        return Response(DialysisMachineSerializer(qs, many=True).data)


class DialysisPatientProfileViewSet(BaseModelViewSet):
    queryset = DialysisPatientProfile.objects.select_related("patient", "nephrologist").prefetch_related("sessions", "access_checks").all()
    filterset_fields = ["status", "vascular_access_type"]
    search_fields = ["profile_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return DialysisPatientProfileListSerializer
        return DialysisPatientProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterDialysisPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})
        if hasattr(patient, "dialysis_profile"):
            raise ValidationError({"patient": "This patient already has a dialysis profile."})

        profile = DialysisPatientProfile.objects.create(
            patient=patient, registered_by=request.user,
            **{k: v for k, v in data.items() if k != "patient"},
        )
        return Response(DialysisPatientProfileSerializer(profile).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="schedule-session")
    def schedule_session(self, request, pk=None):
        profile = self.get_object()
        serializer = ScheduleSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = DialysisSession.objects.create(
            profile=profile, machine_id=data.get("machine"), scheduled_date=data["scheduled_date"],
        )
        return Response(DialysisSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-access-check")
    def add_access_check(self, request, pk=None):
        profile = self.get_object()
        serializer = VascularAccessCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check = serializer.save(profile=profile, checked_by=request.user)
        return Response(VascularAccessCheckSerializer(check).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(status=DialysisPatientStatus.ACTIVE)
        return Response(DialysisPatientProfileListSerializer(qs, many=True).data)


class DialysisSessionViewSet(BaseModelViewSet):
    queryset = DialysisSession.objects.select_related("profile__patient", "machine").all()
    filterset_fields = ["status", "profile", "machine"]
    http_method_names = ["get", "post", "head", "options"]  # created only via schedule_session

    def get_serializer_class(self):
        if self.action == "list":
            return DialysisSessionListSerializer
        return DialysisSessionSerializer

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        session = self.get_object()
        if session.status != SessionStatus.SCHEDULED:
            raise ValidationError({"detail": "Only scheduled sessions can be started."})

        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        machine = DialysisMachine.objects.filter(pk=data["machine"], is_active=True).first()
        if not machine:
            raise ValidationError({"machine": "Machine not found."})
        if machine.status != MachineStatus.AVAILABLE:
            raise ValidationError({"machine": "This machine is not currently available."})

        with transaction.atomic():
            session.machine = machine
            session.status = SessionStatus.IN_PROGRESS
            session.started_at = timezone.now()
            for field in ["pre_weight_kg", "pre_bp_systolic", "pre_bp_diastolic",
                          "ultrafiltration_target_ml", "blood_flow_rate", "dialysate_flow_rate"]:
                if data.get(field) is not None:
                    setattr(session, field, data[field])
            session.performed_by = request.user
            session.save()

            machine.status = MachineStatus.IN_USE
            machine.save(update_fields=["status"])

        return Response(DialysisSessionSerializer(session).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        session = self.get_object()
        if session.status != SessionStatus.IN_PROGRESS:
            raise ValidationError({"detail": "Only in-progress sessions can be completed."})

        serializer = CompleteSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            session.status = SessionStatus.COMPLETED
            session.ended_at = timezone.now()
            session.post_weight_kg = data.get("post_weight_kg")
            session.post_bp_systolic = data.get("post_bp_systolic")
            session.post_bp_diastolic = data.get("post_bp_diastolic")
            session.complications = data.get("complications", "")
            session.nursing_notes = data.get("nursing_notes", "")
            session.save()

            charge = compute_session_charge(session)
            invoice = raise_dialysis_invoice(
                session.profile.patient,
                f"Dialysis Session - {session.session_number} ({session.machine.machine_number if session.machine else 'N/A'})",
                charge, user=request.user,
            )
            session.invoice = invoice
            session.save(update_fields=["invoice"])

            if session.machine:
                session.machine.status = MachineStatus.AVAILABLE
                session.machine.save(update_fields=["status"])

        return Response(DialysisSessionSerializer(session).data)

    @action(detail=True, methods=["post"], url_path="mark-missed")
    def mark_missed(self, request, pk=None):
        session = self.get_object()
        if session.status != SessionStatus.SCHEDULED:
            raise ValidationError({"detail": "Only scheduled sessions can be marked missed."})
        session.status = SessionStatus.MISSED
        session.save(update_fields=["status"])
        return Response(DialysisSessionSerializer(session).data)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        from django.utils import timezone
        qs = self.get_queryset().filter(scheduled_date__date=timezone.now().date())
        return Response(DialysisSessionListSerializer(qs, many=True).data)