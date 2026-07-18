import uuid
from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Department, Supplier, Medicine, MedicineBatch


class RequisitionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    CONVERTED = "CONVERTED", "Converted to PO"
    CANCELLED = "CANCELLED", "Cancelled"


class ItemType(models.TextChoices):
    MEDICINE = "MEDICINE", "Medicine / Drug"
    ASSET = "ASSET", "Asset / Equipment"
    CONSUMABLE = "CONSUMABLE", "General Consumable"
    OTHER = "OTHER", "Other"


class PurchaseRequisition(BaseModel):
    requisition_number = models.CharField(max_length=30, unique=True, editable=False)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="requisitions")
    requested_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="requisitions_made")
    status = models.CharField(max_length=20, choices=RequisitionStatus.choices, default=RequisitionStatus.DRAFT)
    justification = models.TextField(blank=True)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="requisitions_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        db_table = "purchase_requisitions"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.requisition_number:
            from .utils import generate_requisition_number
            self.requisition_number = generate_requisition_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.requisition_number} - {self.department.name}"


class RequisitionItem(BaseModel):
    requisition = models.ForeignKey(PurchaseRequisition, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.MEDICINE)
    medicine = models.ForeignKey(Medicine, null=True, blank=True, on_delete=models.SET_NULL, related_name="requisition_items")
    description = models.CharField(max_length=255, help_text="Free-text item description, required for non-medicine items.")
    quantity_requested = models.PositiveIntegerField()
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "requisition_items"

    def __str__(self):
        return f"{self.description} x{self.quantity_requested}"


class PurchaseOrderStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially Received"
    FULLY_RECEIVED = "FULLY_RECEIVED", "Fully Received"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseOrder(BaseModel):
    po_number = models.CharField(max_length=30, unique=True, editable=False)
    requisition = models.ForeignKey(PurchaseRequisition, null=True, blank=True, on_delete=models.SET_NULL, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    status = models.CharField(max_length=20, choices=PurchaseOrderStatus.choices, default=PurchaseOrderStatus.OPEN)
    order_date = models.DateField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="purchase_orders_created")

    class Meta:
        db_table = "purchase_orders"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.po_number:
            from .utils import generate_po_number
            self.po_number = generate_po_number()
        super().save(*args, **kwargs)

    @property
    def total_amount(self):
        return sum((item.line_total for item in self.items.all()), start=0)

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name}"


class PurchaseOrderItem(BaseModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.MEDICINE)
    medicine = models.ForeignKey(Medicine, null=True, blank=True, on_delete=models.SET_NULL, related_name="po_items")
    description = models.CharField(max_length=255)
    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        db_table = "purchase_order_items"

    @property
    def line_total(self):
        return self.quantity_ordered * self.unit_cost

    @property
    def quantity_outstanding(self):
        return max(self.quantity_ordered - self.quantity_received, 0)

    def __str__(self):
        return f"{self.description} x{self.quantity_ordered}"


class GoodsReceipt(BaseModel):
    grn_number = models.CharField(max_length=30, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="goods_receipts")
    received_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="goods_receipts_recorded")
    delivery_note_ref = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "goods_receipts"
        ordering = ["-received_at"]

    def save(self, *args, **kwargs):
        if not self.grn_number:
            from .utils import generate_grn_number
            self.grn_number = generate_grn_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.grn_number} - {self.purchase_order.po_number}"


class GoodsReceiptItem(BaseModel):
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name="items")
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE, related_name="receipt_items")
    quantity_received = models.PositiveIntegerField()
    batch_number = models.CharField(max_length=60, blank=True, help_text="Required for medicines.")
    expiry_date = models.DateField(null=True, blank=True, help_text="Required for medicines.")
    medicine_batch = models.ForeignKey(MedicineBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name="procurement_receipts")
    asset = models.ForeignKey("assets.Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="procurement_receipt_item")

    class Meta:
        db_table = "goods_receipt_items"

    def __str__(self):
        return f"{self.po_item.description} x{self.quantity_received}"


class SupplierInvoiceStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIAL = "PARTIAL", "Partially Paid"
    PAID = "PAID", "Paid"
    DISPUTED = "DISPUTED", "Disputed"


class SupplierInvoice(BaseModel):
    """
    Accounts-payable invoice — the supplier's bill to us, distinct from
    api.Invoice (which is what we bill patients). Kept in its own table so
    patient billing and supplier billing never intermix.
    """
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    supplier_invoice_ref = models.CharField(max_length=100, blank=True, help_text="Supplier's own invoice/reference number.")
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="supplier_invoices")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="invoices")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=SupplierInvoiceStatus.choices, default=SupplierInvoiceStatus.UNPAID)
    due_date = models.DateField(null=True, blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="supplier_invoices_recorded")

    class Meta:
        db_table = "supplier_invoices"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from .utils import generate_supplier_invoice_number
            self.invoice_number = generate_supplier_invoice_number()
        super().save(*args, **kwargs)

    @property
    def balance(self):
        return self.amount - self.amount_paid

    def recalculate_status(self):
        if self.amount_paid <= 0:
            self.status = SupplierInvoiceStatus.UNPAID
        elif self.amount_paid < self.amount:
            self.status = SupplierInvoiceStatus.PARTIAL
        else:
            self.status = SupplierInvoiceStatus.PAID
        self.save(update_fields=["status", "amount_paid"])

    def __str__(self):
        return f"{self.invoice_number} - {self.supplier.name}"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
    MPESA = "MPESA", "M-Pesa"
    CHEQUE = "CHEQUE", "Cheque"


class SupplierPayment(BaseModel):
    payment_number = models.CharField(max_length=30, unique=True, editable=False)
    supplier_invoice = models.ForeignKey(SupplierInvoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    reference_number = models.CharField(max_length=100, blank=True)
    paid_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="supplier_payments_made")
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "supplier_payments"
        ordering = ["-paid_at"]

    def save(self, *args, **kwargs):
        if not self.payment_number:
            from .utils import generate_supplier_payment_number
            self.payment_number = generate_supplier_payment_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payment_number} - KES {self.amount}"