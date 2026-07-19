from rest_framework import serializers
from .models import (
    PurchaseRequisition, RequisitionItem, PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem, SupplierInvoice, SupplierPayment,
)


class RequisitionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = RequisitionItem
        fields = ["id", "requisition", "item_type", "medicine", "medicine_name", "description", "quantity_requested", "estimated_unit_cost"]
        read_only_fields = ["id", "requisition"]


class PurchaseRequisitionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    items = RequisitionItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseRequisition
        fields = [
            "id", "requisition_number", "department", "department_name", "requested_by",
            "requested_by_name", "status", "justification", "approved_by", "approved_by_name",
            "approved_at", "rejection_reason", "items", "created_at",
        ]
        read_only_fields = ["id", "requisition_number", "requested_by", "status", "approved_by", "approved_at", "created_at"]


class RequisitionItemInputSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=["MEDICINE", "ASSET", "CONSUMABLE", "OTHER"], default="MEDICINE")
    medicine = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    quantity_requested = serializers.IntegerField(min_value=1)
    estimated_unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)


class CreateRequisitionSerializer(serializers.Serializer):
    department = serializers.UUIDField()
    justification = serializers.CharField(required=False, allow_blank=True, default="")
    items = RequisitionItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class RejectRequisitionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField()


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    line_total = serializers.SerializerMethodField()
    quantity_outstanding = serializers.IntegerField(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id", "purchase_order", "item_type", "medicine", "medicine_name", "description",
            "quantity_ordered", "quantity_received", "quantity_outstanding", "unit_cost", "line_total",
        ]
        read_only_fields = ["id", "purchase_order", "quantity_received"]

    def get_line_total(self, obj):
        return str(obj.line_total)


class GoodsReceiptItemSerializer(serializers.ModelSerializer):
    item_description = serializers.CharField(source="po_item.description", read_only=True)
    asset_tag = serializers.CharField(source="asset.asset_tag", read_only=True)

    class Meta:
        model = GoodsReceiptItem
        fields = [
            "id", "goods_receipt", "po_item", "item_description", "quantity_received",
            "batch_number", "expiry_date", "medicine_batch", "asset", "asset_tag",
        ]
        read_only_fields = ["id", "goods_receipt", "medicine_batch", "asset"]


class GoodsReceiptSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    supplier_name = serializers.CharField(source="purchase_order.supplier.name", read_only=True)
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True)
    items = GoodsReceiptItemSerializer(many=True, read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = [
            "id", "grn_number", "purchase_order", "po_number", "supplier_name",
            "received_by", "received_by_name", "delivery_note_ref", "notes", "items", "received_at",
        ]
        read_only_fields = ["id", "grn_number", "received_by", "received_at"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    requisition_number = serializers.CharField(source="requisition.requisition_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    goods_receipts = GoodsReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "requisition", "requisition_number", "supplier", "supplier_name",
            "status", "order_date", "expected_delivery_date", "notes", "created_by",
            "created_by_name", "items", "total_amount", "created_at", "goods_receipts",
        ]
        read_only_fields = ["id", "po_number", "status", "order_date", "created_by", "created_at"]

    def get_total_amount(self, obj):
        return str(obj.total_amount)


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = ["id", "po_number", "supplier_name", "status", "order_date", "expected_delivery_date", "total_amount"]

    def get_total_amount(self, obj):
        return str(obj.total_amount)


class POItemInputSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=["MEDICINE", "ASSET", "CONSUMABLE", "OTHER"], default="MEDICINE")
    medicine = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    quantity_ordered = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CreatePurchaseOrderSerializer(serializers.Serializer):
    requisition = serializers.UUIDField(required=False, allow_null=True)
    supplier = serializers.UUIDField()
    expected_delivery_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = POItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class ReceiptItemInputSerializer(serializers.Serializer):
    po_item = serializers.UUIDField()
    quantity_received = serializers.IntegerField(min_value=1)
    batch_number = serializers.CharField(required=False, allow_blank=True, default="")
    expiry_date = serializers.DateField(required=False, allow_null=True)


class CreateGoodsReceiptSerializer(serializers.Serializer):
    purchase_order = serializers.UUIDField()
    delivery_note_ref = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = ReceiptItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one received item is required.")
        return value


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SupplierInvoice
        fields = [
            "id", "invoice_number", "supplier_invoice_ref", "purchase_order", "po_number",
            "supplier", "supplier_name", "amount", "amount_paid", "balance", "status",
            "due_date", "recorded_by", "created_at",
        ]
        read_only_fields = ["id", "invoice_number", "amount_paid", "status", "recorded_by", "created_at"]


class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier_invoice.supplier.name", read_only=True)
    invoice_number = serializers.CharField(source="supplier_invoice.invoice_number", read_only=True)
    paid_by_name = serializers.CharField(source="paid_by.get_full_name", read_only=True)

    class Meta:
        model = SupplierPayment
        fields = [
            "id", "payment_number", "supplier_invoice", "invoice_number", "supplier_name",
            "amount", "method", "reference_number", "paid_by", "paid_by_name", "paid_at",
        ]
        read_only_fields = ["id", "payment_number", "paid_by", "paid_at"]

    def validate(self, attrs):
        invoice = attrs.get("supplier_invoice") or getattr(self.instance, "supplier_invoice", None)
        amount = attrs.get("amount")
        if invoice and amount and amount > invoice.balance:
            raise serializers.ValidationError(f"Payment amount ({amount}) exceeds outstanding balance ({invoice.balance}).")
        return attrs