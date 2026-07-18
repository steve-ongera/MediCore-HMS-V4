from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Department, Medicine, MedicineBatch, StockTransaction, StockTransactionType

from .models import (
    PurchaseRequisition, RequisitionStatus, RequisitionItem, ItemType,
    PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem, SupplierInvoice, SupplierPayment,
)
from .serializers import (
    PurchaseRequisitionSerializer, CreateRequisitionSerializer, RejectRequisitionSerializer,
    PurchaseOrderSerializer, PurchaseOrderListSerializer, CreatePurchaseOrderSerializer,
    GoodsReceiptSerializer, CreateGoodsReceiptSerializer,
    SupplierInvoiceSerializer, SupplierPaymentSerializer,
)


class PurchaseRequisitionViewSet(BaseModelViewSet):
    queryset = PurchaseRequisition.objects.select_related("department", "requested_by").prefetch_related("items").all()
    filterset_fields = ["status", "department"]
    search_fields = ["requisition_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return PurchaseRequisitionSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateRequisitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            requisition = PurchaseRequisition.objects.create(
                department_id=data["department"],
                requested_by=request.user,
                justification=data.get("justification", ""),
                status=RequisitionStatus.PENDING_APPROVAL,
            )
            for item in data["items"]:
                RequisitionItem.objects.create(
                    requisition=requisition,
                    item_type=item.get("item_type", ItemType.MEDICINE),
                    medicine_id=item.get("medicine"),
                    description=item["description"],
                    quantity_requested=item["quantity_requested"],
                    estimated_unit_cost=item.get("estimated_unit_cost"),
                )

        return Response(PurchaseRequisitionSerializer(requisition).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != RequisitionStatus.PENDING_APPROVAL:
            raise ValidationError({"detail": "Only pending requisitions can be approved."})
        req.status = RequisitionStatus.APPROVED
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save(update_fields=["status", "approved_by", "approved_at"])
        return Response(PurchaseRequisitionSerializer(req).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        req = self.get_object()
        if req.status != RequisitionStatus.PENDING_APPROVAL:
            raise ValidationError({"detail": "Only pending requisitions can be rejected."})
        serializer = RejectRequisitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req.status = RequisitionStatus.REJECTED
        req.rejection_reason = serializer.validated_data["rejection_reason"]
        req.save(update_fields=["status", "rejection_reason"])
        return Response(PurchaseRequisitionSerializer(req).data)

    @action(detail=False, methods=["get"], url_path="pending-approval")
    def pending_approval(self, request):
        qs = self.get_queryset().filter(status=RequisitionStatus.PENDING_APPROVAL)
        return Response(PurchaseRequisitionSerializer(qs, many=True).data)


class PurchaseOrderViewSet(BaseModelViewSet):
    queryset = PurchaseOrder.objects.select_related("supplier", "requisition").prefetch_related("items").all()
    filterset_fields = ["status", "supplier"]
    search_fields = ["po_number", "supplier__name"]

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreatePurchaseOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                requisition_id=data.get("requisition"),
                supplier_id=data["supplier"],
                expected_delivery_date=data.get("expected_delivery_date"),
                notes=data.get("notes", ""),
                created_by=request.user,
            )
            for item in data["items"]:
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    item_type=item.get("item_type", ItemType.MEDICINE),
                    medicine_id=item.get("medicine"),
                    description=item["description"],
                    quantity_ordered=item["quantity_ordered"],
                    unit_cost=item["unit_cost"],
                )
            if data.get("requisition"):
                PurchaseRequisition.objects.filter(pk=data["requisition"]).update(status=RequisitionStatus.CONVERTED)

        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        po = self.get_object()
        if po.status == PurchaseOrderStatus.FULLY_RECEIVED:
            raise ValidationError({"detail": "Cannot cancel a fully received purchase order."})
        po.status = PurchaseOrderStatus.CANCELLED
        po.save(update_fields=["status"])
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=False, methods=["get"], url_path="open")
    def open(self, request):
        qs = self.get_queryset().exclude(status__in=[PurchaseOrderStatus.FULLY_RECEIVED, PurchaseOrderStatus.CANCELLED])
        return Response(PurchaseOrderListSerializer(qs, many=True).data)


class GoodsReceiptViewSet(BaseModelViewSet):
    queryset = GoodsReceipt.objects.select_related("purchase_order__supplier").prefetch_related("items").all()
    filterset_fields = ["purchase_order"]
    search_fields = ["grn_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return GoodsReceiptSerializer

    def create(self, request, *args, **kwargs):
        """
        Records what physically arrived. For MEDICINE items, this
        auto-creates a MedicineBatch + STOCK_IN StockTransaction — the exact
        same mechanism MedicineBatchViewSet.perform_create uses — so
        received drugs immediately show up in Pharmacy/Inventory stock
        levels. For ASSET items, a bare Asset record is created in
        AssetStatus.IN_STORE, ready for the Assets team to assign/deploy.
        """
        serializer = CreateGoodsReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        po = PurchaseOrder.objects.filter(pk=data["purchase_order"]).first()
        if not po:
            raise ValidationError({"purchase_order": "Purchase order not found."})
        if po.status == PurchaseOrderStatus.CANCELLED:
            raise ValidationError({"purchase_order": "Cannot receive against a cancelled purchase order."})

        with transaction.atomic():
            receipt = GoodsReceipt.objects.create(
                purchase_order=po, received_by=request.user,
                delivery_note_ref=data.get("delivery_note_ref", ""), notes=data.get("notes", ""),
            )

            for item_data in data["items"]:
                po_item = PurchaseOrderItem.objects.filter(pk=item_data["po_item"], purchase_order=po).first()
                if not po_item:
                    raise ValidationError({"po_item": f"PO item {item_data['po_item']} not found on this order."})

                qty = item_data["quantity_received"]
                if qty > po_item.quantity_outstanding:
                    raise ValidationError({
                        "quantity_received": f"Cannot receive {qty} — only {po_item.quantity_outstanding} outstanding for '{po_item.description}'."
                    })

                receipt_item = GoodsReceiptItem.objects.create(
                    goods_receipt=receipt, po_item=po_item, quantity_received=qty,
                    batch_number=item_data.get("batch_number", ""),
                    expiry_date=item_data.get("expiry_date"),
                )

                po_item.quantity_received += qty
                po_item.save(update_fields=["quantity_received"])

                if po_item.item_type == ItemType.MEDICINE and po_item.medicine:
                    if not item_data.get("expiry_date"):
                        raise ValidationError({"expiry_date": f"Expiry date is required for medicine '{po_item.description}'."})
                    batch = MedicineBatch.objects.create(
                        medicine=po_item.medicine,
                        batch_number=item_data.get("batch_number") or f"AUTO-{receipt.grn_number}",
                        quantity_received=qty, quantity_remaining=qty,
                        expiry_date=item_data["expiry_date"],
                    )
                    StockTransaction.objects.create(
                        medicine=po_item.medicine, batch=batch, transaction_type=StockTransactionType.STOCK_IN,
                        quantity=qty, reason=f"Goods receipt {receipt.grn_number} ({po.po_number})",
                        performed_by=request.user,
                    )
                    receipt_item.medicine_batch = batch
                    receipt_item.save(update_fields=["medicine_batch"])

                elif po_item.item_type == ItemType.ASSET:
                    from assets.models import Asset, AssetCategory
                    default_category, _ = AssetCategory.objects.get_or_create(
                        name="Uncategorized (from Procurement)",
                        defaults={"default_useful_life_years": 5},
                    )
                    asset = Asset.objects.create(
                        name=po_item.description,
                        category=default_category,
                        supplier=po.supplier,
                        purchase_date=timezone.now().date(),
                        purchase_cost=po_item.unit_cost,
                        registered_by=request.user,
                    )
                    receipt_item.asset = asset
                    receipt_item.save(update_fields=["asset"])

            all_items = po.items.all()
            if all(i.quantity_received >= i.quantity_ordered for i in all_items):
                po.status = PurchaseOrderStatus.FULLY_RECEIVED
            elif any(i.quantity_received > 0 for i in all_items):
                po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED
            po.save(update_fields=["status"])

        return Response(GoodsReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class SupplierInvoiceViewSet(BaseModelViewSet):
    queryset = SupplierInvoice.objects.select_related("supplier", "purchase_order").all()
    serializer_class = SupplierInvoiceSerializer
    filterset_fields = ["status", "supplier", "purchase_order"]
    search_fields = ["invoice_number", "supplier_invoice_ref", "supplier__name"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="outstanding")
    def outstanding(self, request):
        qs = self.get_queryset().exclude(status="PAID")
        return Response(SupplierInvoiceSerializer(qs, many=True).data)


class SupplierPaymentViewSet(BaseModelViewSet):
    queryset = SupplierPayment.objects.select_related("supplier_invoice__supplier").all()
    serializer_class = SupplierPaymentSerializer
    filterset_fields = ["supplier_invoice", "method"]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        payment = serializer.save(paid_by=self.request.user)
        invoice = payment.supplier_invoice
        invoice.amount_paid += payment.amount
        invoice.recalculate_status()