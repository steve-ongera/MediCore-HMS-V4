from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.permissions import HasRole
from api.models import Role

from .models import Equipment, EquipmentStatus, ServiceRequest, ServiceRequestStatus, MaintenanceRecord, Calibration, CalibrationStatus, SparePart, SparePartUsage, ServiceContract
from .serializers import (
    EquipmentSerializer, EquipmentListSerializer, ServiceRequestSerializer,
    MaintenanceRecordSerializer, CalibrationSerializer, SparePartSerializer, ServiceContractSerializer,
)


class IsBiomedEngineer(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.BIOMEDICAL_ENGINEER]
        return super().has_permission(request, view)


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.filter(is_active=True).select_related("supplier")
    permission_classes = [IsBiomedEngineer]
    filterset_fields = ["category", "status", "risk_class"]
    search_fields = ["asset_tag", "name", "serial_number"]

    def get_serializer_class(self):
        return EquipmentListSerializer if self.action == "list" else EquipmentSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="maintenance-due")
    def maintenance_due(self, request):
        from datetime import date, timedelta
        cutoff = date.today() + timedelta(days=14)
        due = [e for e in self.get_queryset() if e.next_preventive_maintenance_due and e.next_preventive_maintenance_due <= cutoff]
        return Response(EquipmentListSerializer(due, many=True).data)

    @action(detail=False, methods=["get"], url_path="calibration-due")
    def calibration_due(self, request):
        from datetime import date, timedelta
        cutoff = date.today() + timedelta(days=14)
        due = [e for e in self.get_queryset() if e.next_calibration_due and e.next_calibration_due <= cutoff]
        return Response(EquipmentListSerializer(due, many=True).data)


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """Reporting a breakdown is open to any staff member — the assigned biomedical engineer resolves it."""
    queryset = ServiceRequest.objects.select_related("equipment", "reported_by", "assigned_to").all()
    serializer_class = ServiceRequestSerializer
    filterset_fields = ["status", "priority", "equipment"]

    def perform_create(self, serializer):
        request_obj = serializer.save(reported_by=self.request.user)
        request_obj.equipment.status = EquipmentStatus.OUT_OF_SERVICE if request_obj.priority == "EMERGENCY" else request_obj.equipment.status
        request_obj.equipment.save(update_fields=["status"])

    def get_permissions(self):
        if self.action in ("assign", "resolve", "cancel"):
            return [IsBiomedEngineer()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        req = self.get_object()
        req.assigned_to = request.user
        req.status = ServiceRequestStatus.ASSIGNED
        req.save(update_fields=["assigned_to", "status"])
        return Response(ServiceRequestSerializer(req).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        req = self.get_object()
        if req.status not in (ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS):
            raise ValidationError({"detail": "Only assigned/in-progress requests can be resolved."})

        with transaction.atomic():
            req.status = ServiceRequestStatus.RESOLVED
            req.resolved_at = timezone.now()
            req.save(update_fields=["status", "resolved_at"])

            MaintenanceRecord.objects.create(
                equipment=req.equipment, service_request=req, maintenance_type="CORRECTIVE",
                status="COMPLETED", performed_by=request.user,
                work_done=request.data.get("work_done", ""), parts_used=request.data.get("parts_used", ""),
                cost=request.data.get("cost", 0), completed_at=timezone.now(),
            )

            req.equipment.status = EquipmentStatus.OPERATIONAL
            req.equipment.save(update_fields=["status"])

        return Response(ServiceRequestSerializer(req).data)

    @action(detail=False, methods=["get"], url_path="open")
    def open(self, request):
        qs = self.get_queryset().exclude(status__in=[ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CANCELLED])
        return Response(ServiceRequestSerializer(qs, many=True).data)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related("equipment", "performed_by").all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsBiomedEngineer]
    filterset_fields = ["equipment", "maintenance_type", "status"]

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        record = self.get_object()
        record.status = "COMPLETED"
        record.performed_by = request.user
        record.work_done = request.data.get("work_done", record.work_done)
        record.cost = request.data.get("cost", record.cost)
        record.completed_at = timezone.now()
        record.save()
        return Response(MaintenanceRecordSerializer(record).data)


class CalibrationViewSet(viewsets.ModelViewSet):
    queryset = Calibration.objects.select_related("equipment", "performed_by").all()
    serializer_class = CalibrationSerializer
    permission_classes = [IsBiomedEngineer]
    filterset_fields = ["equipment", "status"]

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        cal = self.get_object()
        cal.status = request.data.get("status", "COMPLETED")
        cal.performed_by = request.user
        cal.calibrated_at = timezone.now()
        cal.reference_standard = request.data.get("reference_standard", "")
        cal.result_notes = request.data.get("result_notes", "")
        cal.certificate_number = request.data.get("certificate_number", "")
        cal.save()
        return Response(CalibrationSerializer(cal).data)


class SparePartViewSet(viewsets.ModelViewSet):
    queryset = SparePart.objects.select_related("supplier").all()
    serializer_class = SparePartSerializer
    permission_classes = [IsBiomedEngineer]
    search_fields = ["part_number", "name"]

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        qs = [p for p in self.get_queryset() if p.is_low_stock]
        return Response(SparePartSerializer(qs, many=True).data)


class ServiceContractViewSet(viewsets.ModelViewSet):
    queryset = ServiceContract.objects.prefetch_related("equipment").all()
    serializer_class = ServiceContractSerializer
    permission_classes = [IsBiomedEngineer]
    filterset_fields = ["is_active"]

    @action(detail=False, methods=["get"], url_path="expiring-soon")
    def expiring_soon(self, request):
        qs = [c for c in self.get_queryset() if c.is_expiring_soon]
        return Response(ServiceContractSerializer(qs, many=True).data)