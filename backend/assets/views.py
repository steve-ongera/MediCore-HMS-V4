from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin, IsSuperAdmin

from .models import (
    AssetCategory, Asset, AssetStatus, AssetMaintenance, MaintenanceStatus,
    AssetTransfer, AssetDisposal,
)
from .serializers import (
    AssetCategorySerializer, AssetSerializer, AssetListSerializer,
    AssetMaintenanceSerializer, AssetTransferSerializer, AssetDisposalSerializer,
    TransferAssetSerializer, DisposeAssetSerializer,
)


class AssetCategoryViewSet(BaseModelViewSet):
    queryset = AssetCategory.objects.filter(is_active=True)
    serializer_class = AssetCategorySerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name"]


class AssetViewSet(BaseModelViewSet):
    queryset = Asset.objects.select_related("category", "supplier", "department", "assigned_to").all()
    filterset_fields = ["category", "department", "status", "condition"]
    search_fields = ["asset_tag", "name", "serial_number", "manufacturer"]

    def get_serializer_class(self):
        if self.action == "list":
            return AssetListSerializer
        return AssetSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self.get_queryset()
        total_assets = qs.count()
        total_value = sum((a.current_value for a in qs), start=0)
        by_status = list(qs.values("status").annotate(count=__import__("django.db.models", fromlist=["Count"]).Count("id")))
        under_warranty = len([a for a in qs if a.is_under_warranty])
        under_maintenance = qs.filter(status=AssetStatus.UNDER_MAINTENANCE).count()

        return Response({
            "total_assets": total_assets,
            "total_current_value": str(total_value),
            "by_status": by_status,
            "under_warranty": under_warranty,
            "under_maintenance": under_maintenance,
        })

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        asset = self.get_object()
        serializer = TransferAssetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            AssetTransfer.objects.create(
                asset=asset,
                from_department=asset.department,
                to_department_id=data.get("to_department"),
                from_custodian=asset.assigned_to,
                to_custodian_id=data.get("to_custodian"),
                reason=data.get("reason", ""),
                transferred_by=request.user,
            )
            if data.get("to_department"):
                asset.department_id = data["to_department"]
            if "to_custodian" in data:
                asset.assigned_to_id = data.get("to_custodian")
            asset.status = AssetStatus.IN_USE if asset.assigned_to_id else AssetStatus.IN_STORE
            asset.save(update_fields=["department", "assigned_to", "status"])

        return Response(AssetSerializer(asset).data)

    @action(detail=True, methods=["post"], url_path="dispose")
    def dispose(self, request, pk=None):
        asset = self.get_object()
        if hasattr(asset, "disposal"):
            raise ValidationError({"detail": "This asset has already been disposed."})

        serializer = DisposeAssetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            AssetDisposal.objects.create(
                asset=asset,
                disposal_date=data["disposal_date"],
                disposal_method=data["disposal_method"],
                disposal_value=data.get("disposal_value", 0),
                reason=data.get("reason", ""),
                approved_by_id=data.get("approved_by"),
                recorded_by=request.user,
            )
            asset.status = AssetStatus.DISPOSED
            asset.assigned_to = None
            asset.save(update_fields=["status", "assigned_to"])

        return Response(AssetSerializer(asset).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="warranty-expiring")
    def warranty_expiring(self, request):
        from datetime import date, timedelta
        cutoff = date.today() + timedelta(days=30)
        qs = self.get_queryset().filter(warranty_expiry__isnull=False, warranty_expiry__lte=cutoff, warranty_expiry__gte=date.today())
        return Response(AssetListSerializer(qs, many=True).data)


class AssetMaintenanceViewSet(BaseModelViewSet):
    queryset = AssetMaintenance.objects.select_related("asset").all()
    serializer_class = AssetMaintenanceSerializer
    filterset_fields = ["asset", "status", "maintenance_type"]

    def perform_create(self, serializer):
        maintenance = serializer.save(logged_by=self.request.user)
        if maintenance.status in (MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS):
            asset = maintenance.asset
            asset.status = "UNDER_MAINTENANCE"
            asset.save(update_fields=["status"])

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        maintenance = self.get_object()
        from datetime import date
        maintenance.status = MaintenanceStatus.COMPLETED
        maintenance.completed_date = date.today()
        maintenance.save(update_fields=["status", "completed_date"])

        asset = maintenance.asset
        if not asset.maintenance_records.filter(status__in=[MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]).exclude(pk=maintenance.pk).exists():
            asset.status = AssetStatus.IN_USE if asset.assigned_to else AssetStatus.IN_STORE
            asset.save(update_fields=["status"])

        return Response(AssetMaintenanceSerializer(maintenance).data)


class AssetTransferViewSet(BaseModelViewSet):
    queryset = AssetTransfer.objects.select_related("asset", "from_department", "to_department").all()
    serializer_class = AssetTransferSerializer
    filterset_fields = ["asset"]
    http_method_names = ["get", "head", "options"]  # created only via AssetViewSet.transfer


class AssetDisposalViewSet(BaseModelViewSet):
    queryset = AssetDisposal.objects.select_related("asset").all()
    serializer_class = AssetDisposalSerializer
    filterset_fields = ["disposal_method"]
    http_method_names = ["get", "head", "options"]  # created only via AssetViewSet.dispose