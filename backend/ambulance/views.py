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
    Ambulance, AmbulanceStatus, AmbulanceCrewMember, AmbulanceDispatch,
    DispatchStatus, DispatchCrewMember, AmbulanceMaintenanceLog,
)
from .serializers import (
    AmbulanceSerializer, AmbulanceCrewMemberSerializer, AmbulanceDispatchSerializer,
    AmbulanceDispatchListSerializer, DispatchCrewMemberSerializer, AmbulanceMaintenanceLogSerializer,
    RequestDispatchSerializer, UpdateDispatchStatusSerializer, AssignCrewSerializer,
)
from .services import raise_dispatch_invoice


class AmbulanceViewSet(BaseModelViewSet):
    queryset = Ambulance.objects.filter(is_active=True)
    serializer_class = AmbulanceSerializer
    filterset_fields = ["ambulance_type", "status"]
    search_fields = ["registration_number", "make_model"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=AmbulanceStatus.AVAILABLE)
        return Response(AmbulanceSerializer(qs, many=True).data)


class AmbulanceCrewMemberViewSet(BaseModelViewSet):
    queryset = AmbulanceCrewMember.objects.select_related("ambulance", "user").filter(is_active=True)
    serializer_class = AmbulanceCrewMemberSerializer
    filterset_fields = ["ambulance", "role"]


class AmbulanceMaintenanceLogViewSet(BaseModelViewSet):
    queryset = AmbulanceMaintenanceLog.objects.select_related("ambulance").all()
    serializer_class = AmbulanceMaintenanceLogSerializer
    filterset_fields = ["ambulance", "maintenance_type"]

    def perform_create(self, serializer):
        log = serializer.save(logged_by=self.request.user)
        if log.maintenance_type in ("SERVICE", "REPAIR"):
            ambulance = log.ambulance
            ambulance.status = AmbulanceStatus.UNDER_MAINTENANCE
            ambulance.save(update_fields=["status"])


class AmbulanceDispatchViewSet(BaseModelViewSet):
    queryset = AmbulanceDispatch.objects.select_related("ambulance", "patient", "requested_by").prefetch_related("crew").all()
    filterset_fields = ["status", "dispatch_type", "ambulance"]
    search_fields = ["dispatch_number", "patient__full_name", "patient_name_freetext", "pickup_location"]

    def get_serializer_class(self):
        if self.action == "list":
            return AmbulanceDispatchListSerializer
        return AmbulanceDispatchSerializer

    def create(self, request, *args, **kwargs):
        serializer = RequestDispatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = None
        if data.get("patient"):
            patient = Patient.objects.filter(pk=data["patient"]).first()
            if not patient:
                raise ValidationError({"patient": "Patient not found."})

        ambulance = None
        if data.get("ambulance"):
            ambulance = Ambulance.objects.filter(pk=data["ambulance"], is_active=True).first()
            if not ambulance:
                raise ValidationError({"ambulance": "Ambulance not found."})
            if ambulance.status != AmbulanceStatus.AVAILABLE:
                raise ValidationError({"ambulance": "This ambulance is not currently available."})

        with transaction.atomic():
            dispatch = AmbulanceDispatch.objects.create(
                ambulance=ambulance, patient=patient,
                patient_name_freetext=data.get("patient_name_freetext", ""),
                contact_phone=data.get("contact_phone", ""),
                dispatch_type=data["dispatch_type"],
                pickup_location=data["pickup_location"],
                destination=data.get("destination", "Facility"),
                notes=data.get("notes", ""),
                requested_by=request.user,
            )
            if ambulance:
                ambulance.status = AmbulanceStatus.ON_CALL
                ambulance.save(update_fields=["status"])

        return Response(AmbulanceDispatchSerializer(dispatch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign-ambulance")
    def assign_ambulance(self, request, pk=None):
        dispatch = self.get_object()
        ambulance_id = request.data.get("ambulance")
        ambulance = Ambulance.objects.filter(pk=ambulance_id, is_active=True).first()
        if not ambulance:
            raise ValidationError({"ambulance": "Ambulance not found."})
        if ambulance.status != AmbulanceStatus.AVAILABLE:
            raise ValidationError({"ambulance": "This ambulance is not currently available."})

        with transaction.atomic():
            dispatch.ambulance = ambulance
            dispatch.status = DispatchStatus.DISPATCHED
            dispatch.dispatched_at = timezone.now()
            dispatch.save(update_fields=["ambulance", "status", "dispatched_at"])
            ambulance.status = AmbulanceStatus.ON_CALL
            ambulance.save(update_fields=["status"])

        return Response(AmbulanceDispatchSerializer(dispatch).data)

    @action(detail=True, methods=["post"], url_path="assign-crew")
    def assign_crew(self, request, pk=None):
        dispatch = self.get_object()
        serializer = AssignCrewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        crew, _ = DispatchCrewMember.objects.get_or_create(
            dispatch=dispatch, user_id=serializer.validated_data["user"],
            defaults={"role": serializer.validated_data["role"]},
        )
        return Response(DispatchCrewMemberSerializer(crew).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark-patient-onboard")
    def mark_patient_onboard(self, request, pk=None):
        dispatch = self.get_object()
        if dispatch.status != DispatchStatus.DISPATCHED:
            raise ValidationError({"detail": "Dispatch must be en route before marking patient onboard."})
        dispatch.status = DispatchStatus.PATIENT_ONBOARD
        dispatch.picked_up_at = timezone.now()
        dispatch.save(update_fields=["status", "picked_up_at"])
        return Response(AmbulanceDispatchSerializer(dispatch).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        dispatch = self.get_object()
        if dispatch.status not in (DispatchStatus.DISPATCHED, DispatchStatus.PATIENT_ONBOARD):
            raise ValidationError({"detail": "Only an active dispatch can be completed."})

        serializer = UpdateDispatchStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            if data.get("distance_km") is not None:
                dispatch.distance_km = data["distance_km"]
            if data.get("notes"):
                dispatch.notes = (dispatch.notes + "\n" + data["notes"]).strip()
            dispatch.status = DispatchStatus.COMPLETED
            dispatch.completed_at = timezone.now()
            dispatch.save(update_fields=["distance_km", "notes", "status", "completed_at"])

            raise_dispatch_invoice(dispatch, user=request.user)

            if dispatch.ambulance:
                dispatch.ambulance.status = AmbulanceStatus.AVAILABLE
                dispatch.ambulance.save(update_fields=["status"])

        return Response(AmbulanceDispatchSerializer(dispatch).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        dispatch = self.get_object()
        if dispatch.status in (DispatchStatus.COMPLETED, DispatchStatus.CANCELLED):
            raise ValidationError({"detail": "This dispatch is already closed."})
        dispatch.status = DispatchStatus.CANCELLED
        dispatch.save(update_fields=["status"])
        if dispatch.ambulance and dispatch.ambulance.status == AmbulanceStatus.ON_CALL:
            dispatch.ambulance.status = AmbulanceStatus.AVAILABLE
            dispatch.ambulance.save(update_fields=["status"])
        return Response(AmbulanceDispatchSerializer(dispatch).data)

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().exclude(status__in=[DispatchStatus.COMPLETED, DispatchStatus.CANCELLED])
        return Response(AmbulanceDispatchListSerializer(qs, many=True).data)