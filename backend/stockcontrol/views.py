from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin
from security.services import log_audit_event
from security.models import AuditEventType

from .models import (
    StoreLocation, StoreStock, StockTransferRequest, StockTransferItem, TransferStatus,
    StockCount, StockCountLine, StockCountStatus,
)
from .serializers import (
    StoreLocationSerializer, StoreStockSerializer,
    StockTransferRequestSerializer, StockTransferListSerializer, CreateTransferSerializer,
    DispatchTransferSerializer, ReceiveTransferSerializer,
    StockCountSerializer, SubmitStockCountSerializer,
)
from .services import get_or_create_stock, dispatch_transfer, receive_transfer, approve_stock_count
from api.permissions import ReadOnlyOrSuperAdmin, IsPharmacist

class StoreLocationViewSet(BaseModelViewSet):
    queryset = StoreLocation.objects.filter(is_active=True)
    serializer_class = StoreLocationSerializer
    permission_classes = [ReadOnlyOrSuperAdmin | IsPharmacist]
    search_fields = ["name"]

    @action(detail=True, methods=["get"], url_path="stock")
    def stock(self, request, pk=None):
        location = self.get_object()
        stock = StoreStock.objects.filter(
            location=location,
            quantity_on_hand__gt=0
        ).select_related("medicine")
        return Response(StoreStockSerializer(stock, many=True).data)

class StockTransferRequestViewSet(BaseModelViewSet):
    queryset = StockTransferRequest.objects.select_related("from_location", "to_location").prefetch_related("items").all()
    filterset_fields = ["status", "from_location", "to_location"]
    search_fields = ["transfer_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return StockTransferListSerializer
        return StockTransferRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            transfer = StockTransferRequest.objects.create(
                from_location_id=data["from_location"], to_location_id=data["to_location"],
                notes=data.get("notes", ""), requested_by=request.user,
            )
            for item in data["items"]:
                StockTransferItem.objects.create(
                    transfer=transfer, medicine_id=item["medicine"], quantity_requested=item["quantity_requested"],
                )

        return Response(StockTransferRequestSerializer(transfer).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != TransferStatus.REQUESTED:
            raise ValidationError({"detail": "Only requested transfers can be approved."})
        transfer.status = TransferStatus.APPROVED
        transfer.approved_by = request.user
        from django.utils import timezone
        transfer.approved_at = timezone.now()
        transfer.save(update_fields=["status", "approved_by", "approved_at"])
        return Response(StockTransferRequestSerializer(transfer).data)

    @action(detail=True, methods=["post"], url_path="dispatch")
    def dispatch(self, request, pk=None):
        """Sender confirms exactly what physically left their location — this is when source stock is deducted."""
        transfer = self.get_object()
        if transfer.status != TransferStatus.APPROVED:
            raise ValidationError({"detail": "Only approved transfers can be dispatched."})

        serializer = DispatchTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for item in transfer.items.all():
            qty = serializer.validated_data["quantities"].get(str(item.id))
            if qty and qty > 0:
                stock = get_or_create_stock(transfer.from_location, item.medicine)
                if stock.quantity_on_hand < qty:
                    raise ValidationError({"detail": f"{item.medicine.name}: only {stock.quantity_on_hand} available at {transfer.from_location.name}, cannot dispatch {qty}."})

        transfer = dispatch_transfer(transfer, serializer.validated_data["quantities"], request.user)
        log_audit_event(AuditEventType.LOGIN, user=request.user, request=request,
                         description=f"Dispatched stock transfer {transfer.transfer_number} from {transfer.from_location.name}.")
        return Response(StockTransferRequestSerializer(transfer).data)

    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        """Receiver independently confirms what physically arrived — any mismatch with what was dispatched is flagged automatically as a discrepancy."""
        transfer = self.get_object()
        if transfer.status != TransferStatus.DISPATCHED:
            raise ValidationError({"detail": "Only dispatched transfers can be received."})

        serializer = ReceiveTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transfer = receive_transfer(transfer, serializer.validated_data["quantities"], request.user)

        description = f"Received stock transfer {transfer.transfer_number} at {transfer.to_location.name}."
        if transfer.status == TransferStatus.DISCREPANCY:
            description += " DISCREPANCY FLAGGED — dispatched quantity does not match received quantity."
        log_audit_event(AuditEventType.LOGIN, user=request.user, request=request, description=description)

        return Response(StockTransferRequestSerializer(transfer).data)

    @action(detail=False, methods=["get"], url_path="discrepancies")
    def discrepancies(self, request):
        qs = self.get_queryset().filter(status=TransferStatus.DISCREPANCY)
        return Response(StockTransferRequestSerializer(qs, many=True).data)


class StockCountViewSet(BaseModelViewSet):
    queryset = StockCount.objects.select_related("location", "counted_by").prefetch_related("lines").all()
    serializer_class = StockCountSerializer
    filterset_fields = ["status", "location"]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        location_id = request.data.get("location")
        location = StoreLocation.objects.filter(pk=location_id).first()
        if not location:
            raise ValidationError({"location": "Location not found."})
        stock_count = StockCount.objects.create(location=location, counted_by=request.user)
        return Response(StockCountSerializer(stock_count).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Records the physical count against the system's current ledger snapshot, computing variance line by line."""
        stock_count = self.get_object()
        if stock_count.status != StockCountStatus.IN_PROGRESS:
            raise ValidationError({"detail": "This count has already been submitted."})

        serializer = SubmitStockCountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            has_variance = False
            for line in serializer.validated_data["lines"]:
                stock = get_or_create_stock(stock_count.location, None) if False else None  # placeholder removed below
                system_stock = StoreStock.objects.filter(location=stock_count.location, medicine_id=line["medicine"]).first()
                system_qty = system_stock.quantity_on_hand if system_stock else 0
                count_line = StockCountLine.objects.create(
                    stock_count=stock_count, medicine_id=line["medicine"],
                    system_quantity=system_qty, counted_quantity=line["counted_quantity"],
                    explanation=line.get("explanation", ""),
                )
                if count_line.variance != 0:
                    has_variance = True

            from django.utils import timezone
            stock_count.status = StockCountStatus.VARIANCE_PENDING if has_variance else StockCountStatus.SUBMITTED
            stock_count.submitted_at = timezone.now()
            stock_count.save(update_fields=["status", "submitted_at"])

        return Response(StockCountSerializer(stock_count).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        stock_count = self.get_object()
        if stock_count.status not in (StockCountStatus.SUBMITTED, StockCountStatus.VARIANCE_PENDING):
            raise ValidationError({"detail": "This count is not awaiting approval."})
        if stock_count.status == StockCountStatus.VARIANCE_PENDING and request.user.role not in ("PHARMACIST", "ACCOUNTANT", "SUPER_ADMIN"):
            raise PermissionDenied("A variance requires pharmacist/accountant/super admin approval.")

        stock_count = approve_stock_count(stock_count, request.user)
        log_audit_event(AuditEventType.LOGIN, user=request.user, request=request,
                         description=f"Approved stock count {stock_count.count_number} at {stock_count.location.name}.")
        return Response(StockCountSerializer(stock_count).data)

    @action(detail=False, methods=["get"], url_path="variance-pending")
    def variance_pending(self, request):
        qs = self.get_queryset().filter(status=StockCountStatus.VARIANCE_PENDING)
        return Response(StockCountSerializer(qs, many=True).data)