import uuid
from django.db import models

from api.models import BaseModel, User, Payment, OTCSale


class VATCategory(models.TextChoices):
    """
    KRA's standard VAT category codes. Rates shown are indicative — confirm
    current rates with KRA/your tax advisor before going live; they change
    periodically via Finance Act amendments.
    """
    A_EXEMPT = "A", "A - Exempt (0%)"
    B_STANDARD = "B", "B - Standard Rate (16%)"
    C_ZERO_RATED = "C", "C - Zero Rated (0%)"
    D_NON_VATABLE = "D", "D - Non-VATable"
    E_REDUCED = "E", "E - Reduced Rate (8%)"


class FiscalizationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    FISCALIZED = "FISCALIZED", "Fiscalized"
    FAILED = "FAILED", "Failed"
    VOIDED = "VOIDED", "Voided"


class FiscalizationConfig(BaseModel):
    """
    Single active row holding this facility's eTIMS/OSCU credentials.
    Kept as a DB-editable singleton (rather than settings-only) so
    non-technical admin staff can update the KRA PIN / CU serial without a
    deploy, once KRA issues or rotates them.
    """
    kra_pin = models.CharField(max_length=20)
    branch_id = models.CharField(max_length=10, default="00")
    cu_serial = models.CharField(max_length=60, blank=True)
    default_vat_category = models.CharField(max_length=1, choices=VATCategory.choices, default=VATCategory.A_EXEMPT)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "fiscalization_config"

    def __str__(self):
        return f"eTIMS Config - PIN {self.kra_pin}"


class FiscalizedReceipt(BaseModel):
    """
    One row per fiscalization event, generic across the two real
    point-of-sale triggers in this HMIS: a hospital Payment (cash/mpesa/card/
    insurance settlement against an Invoice) or a walk-in OTCSale. Exactly
    one of payment/otc_sale is set — mirrors the nullable-FK cross-app
    pattern already used throughout this codebase (e.g. DeliveryRecord.admission).
    """
    payment = models.OneToOneField(Payment, null=True, blank=True, on_delete=models.CASCADE, related_name="fiscalized_receipt")
    otc_sale = models.OneToOneField(OTCSale, null=True, blank=True, on_delete=models.CASCADE, related_name="fiscalized_receipt")

    status = models.CharField(max_length=20, choices=FiscalizationStatus.choices, default=FiscalizationStatus.PENDING)
    kra_invoice_number = models.CharField(max_length=60, blank=True)
    cu_invoice_number = models.CharField(max_length=60, blank=True, help_text="Control Unit internal invoice number, if distinct from kra_invoice_number.")
    qr_code_url = models.URLField(blank=True)
    cu_signature = models.CharField(max_length=255, blank=True)
    fiscalized_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    triggered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="fiscalizations_triggered")

    class Meta:
        db_table = "fiscalized_receipts"

    @property
    def source_description(self):
        if self.payment:
            return f"Payment {self.payment.receipt_number}"
        if self.otc_sale:
            return f"OTC Sale {self.otc_sale.sale_number}"
        return "Unknown"

    @property
    def total_amount(self):
        if self.payment:
            return self.payment.amount
        if self.otc_sale:
            return self.otc_sale.total_amount
        return 0

    def __str__(self):
        return f"{self.source_description} - {self.status}"


class FiscalizedReceiptItem(BaseModel):
    """Line items transmitted to KRA — one per invoice description (Payment) or per OTCSaleItem (OTCSale)."""
    receipt = models.ForeignKey(FiscalizedReceipt, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    vat_category = models.CharField(max_length=1, choices=VATCategory.choices, default=VATCategory.A_EXEMPT)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "fiscalized_receipt_items"