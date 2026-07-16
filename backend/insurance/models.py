import uuid
from datetime import date

from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice


class InsurerType(models.TextChoices):
    SHA = "SHA", "Social Health Authority (SHA)"
    PRIVATE = "PRIVATE", "Private Insurer"


class Insurer(BaseModel):
    """
    Both SHA and private payers (AAR, Britam, CIC, Jubilee, etc.) live here.
    insurer_type determines which gateway handles eligibility/claims —
    see insurance/gateways/factory.py.
    """
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=30, unique=True)
    insurer_type = models.CharField(max_length=20, choices=InsurerType.choices, default=InsurerType.PRIVATE)
    requires_preauth = models.BooleanField(default=False)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "insurers"

    def __str__(self):
        return self.name


class PatientInsurancePolicy(BaseModel):
    """
    A patient's coverage under a given insurer. member_number is the
    generic policy/member ID (for SHA this is the SHA/SHIF number).
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="insurance_policies")
    insurer = models.ForeignKey(Insurer, on_delete=models.PROTECT, related_name="policies")
    member_number = models.CharField(max_length=60)
    scheme_name = models.CharField(max_length=150, blank=True)
    principal_member_name = models.CharField(max_length=150, blank=True)
    relationship = models.CharField(
        max_length=30,
        choices=[("PRINCIPAL", "Principal"), ("SPOUSE", "Spouse"), ("CHILD", "Child"), ("OTHER", "Other")],
        default="PRINCIPAL",
    )
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="policies_registered")

    class Meta:
        db_table = "patient_insurance_policies"
        unique_together = ("patient", "insurer", "member_number")

    @property
    def is_currently_valid(self):
        today = date.today()
        if not self.is_active:
            return False
        if self.valid_from and self.valid_from > today:
            return False
        if self.valid_to and self.valid_to < today:
            return False
        return True

    def __str__(self):
        return f"{self.patient.full_name} - {self.insurer.name} ({self.member_number})"


class EligibilityCheck(BaseModel):
    """Audit log of every eligibility verification call, mocked or real."""
    policy = models.ForeignKey(PatientInsurancePolicy, on_delete=models.CASCADE, related_name="eligibility_checks")
    is_eligible = models.BooleanField()
    scheme_returned = models.CharField(max_length=150, blank=True)
    member_status = models.CharField(max_length=100, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    checked_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="eligibility_checks_run")
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eligibility_checks"
        ordering = ["-checked_at"]


class ClaimStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    APPROVED = "APPROVED", "Approved"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED", "Partially Approved"
    REJECTED = "REJECTED", "Rejected"
    SETTLED = "SETTLED", "Settled"
    CANCELLED = "CANCELLED", "Cancelled"


class InsuranceClaim(BaseModel):
    claim_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="insurance_claims")
    policy = models.ForeignKey(PatientInsurancePolicy, on_delete=models.PROTECT, related_name="claims")
    visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="insurance_claims")

    status = models.CharField(max_length=20, choices=ClaimStatus.choices, default=ClaimStatus.DRAFT)
    total_claimed = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_approved = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    gateway_reference = models.CharField(max_length=100, blank=True, help_text="SHA claim ID or insurer reference, once known.")
    submitted_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="insurance_claims_created")

    class Meta:
        db_table = "insurance_claims"

    def save(self, *args, **kwargs):
        if not self.claim_number:
            from .utils import generate_claim_number
            self.claim_number = generate_claim_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} - {self.patient.full_name}"


class ClaimItem(BaseModel):
    claim = models.ForeignKey(InsuranceClaim, on_delete=models.CASCADE, related_name="items")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="claim_items")
    benefit_code = models.CharField(max_length=60, blank=True, help_text="SHA benefit package code or insurer service code, if applicable.")
    amount_claimed = models.DecimalField(max_digits=10, decimal_places=2)
    amount_approved = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "claim_items"
        unique_together = ("claim", "invoice")

    def __str__(self):
        return f"{self.invoice.invoice_number} on {self.claim.claim_number}"