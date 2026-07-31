from django.db import models
from api.models import BaseModel, User, Invoice, Payment


class RefundStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    PROCESSED = "PROCESSED", "Processed"


class Refund(BaseModel):
    """
    Refunds don't exist anywhere else in the system yet — this is the first
    real model for them. A refund always references the original Payment
    being reversed, so the executive dashboard can net it against revenue.
    """
    refund_number = models.CharField(max_length=30, unique=True, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=RefundStatus.choices, default=RefundStatus.REQUESTED)

    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="refunds_requested")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="refunds_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "refunds"
        ordering = ["-requested_at"]

    def save(self, *args, **kwargs):
        if not self.refund_number:
            import uuid
            from django.utils import timezone
            self.refund_number = f"REF-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.refund_number} - KES {self.amount} ({self.status})"


class BillCancellation(BaseModel):
    """
    Also doesn't exist yet — tracks when an Invoice is cancelled (vs simply
    unpaid). Cancelled ≠ unpaid: cancellation means the charge itself was
    voided (wrong patient, duplicate entry, clinical error), which the
    owner needs visibility into separately from normal outstanding debt.
    """
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="cancellation")
    reason = models.TextField()
    cancelled_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="bill_cancellations")
    cancelled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bill_cancellations"
        ordering = ["-cancelled_at"]

    def __str__(self):
        return f"Cancelled - {self.invoice.invoice_number}"