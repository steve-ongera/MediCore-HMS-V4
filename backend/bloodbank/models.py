from datetime import date, timedelta

from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class BloodGroup(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"


# Standard ABO/Rh compatibility for whole blood / red cell transfusion.
# Recipient group -> list of compatible donor groups.
COMPATIBILITY_MAP = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],  # universal recipient
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],  # universal donor group, but O- recipients need O-
}


class DonorStatus(models.TextChoices):
    ELIGIBLE = "ELIGIBLE", "Eligible"
    TEMPORARILY_DEFERRED = "TEMPORARILY_DEFERRED", "Temporarily Deferred"
    PERMANENTLY_DEFERRED = "PERMANENTLY_DEFERRED", "Permanently Deferred"


class BloodDonor(BaseModel):
    donor_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_donor_profile")
    full_name = models.CharField(max_length=150)
    national_id = models.CharField(max_length=30, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=5, choices=BloodGroup.choices)
    status = models.CharField(max_length=30, choices=DonorStatus.choices, default=DonorStatus.ELIGIBLE)
    deferral_reason = models.TextField(blank=True)
    deferred_until = models.DateField(null=True, blank=True)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="blood_donors_registered")

    class Meta:
        db_table = "blood_donors"

    def save(self, *args, **kwargs):
        if not self.donor_number:
            from .utils import generate_donor_number
            self.donor_number = generate_donor_number()
        super().save(*args, **kwargs)

    @property
    def is_currently_eligible(self):
        if self.status == DonorStatus.PERMANENTLY_DEFERRED:
            return False
        if self.status == DonorStatus.TEMPORARILY_DEFERRED:
            if self.deferred_until and self.deferred_until <= date.today():
                return True
            return False
        return True

    def __str__(self):
        return f"{self.donor_number} - {self.full_name} ({self.blood_group})"


class ComponentType(models.TextChoices):
    WHOLE_BLOOD = "WHOLE_BLOOD", "Whole Blood"
    PACKED_RED_CELLS = "PACKED_RED_CELLS", "Packed Red Cells (PRBC)"
    PLATELETS = "PLATELETS", "Platelets"
    FRESH_FROZEN_PLASMA = "FRESH_FROZEN_PLASMA", "Fresh Frozen Plasma (FFP)"
    CRYOPRECIPITATE = "CRYOPRECIPITATE", "Cryoprecipitate"


class BloodDonation(BaseModel):
    donation_number = models.CharField(max_length=30, unique=True, editable=False)
    donor = models.ForeignKey(BloodDonor, on_delete=models.CASCADE, related_name="donations")
    donation_date = models.DateTimeField(auto_now_add=True)
    volume_ml = models.PositiveIntegerField(default=450)
    hemoglobin_level = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    collected_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="blood_donations_collected")
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "blood_donations"
        ordering = ["-donation_date"]

    def save(self, *args, **kwargs):
        if not self.donation_number:
            from .utils import generate_donation_number
            self.donation_number = generate_donation_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.donation_number} - {self.donor.full_name}"


class UnitStatus(models.TextChoices):
    QUARANTINED = "QUARANTINED", "Quarantined (Pending Screening)"
    AVAILABLE = "AVAILABLE", "Available"
    RESERVED = "RESERVED", "Reserved"
    ISSUED = "ISSUED", "Issued"
    EXPIRED = "EXPIRED", "Expired"
    DISCARDED = "DISCARDED", "Discarded"


class BloodUnit(BaseModel):
    unit_number = models.CharField(max_length=30, unique=True, editable=False)
    donation = models.ForeignKey(BloodDonation, null=True, blank=True, on_delete=models.SET_NULL, related_name="units")
    blood_group = models.CharField(max_length=5, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices, default=ComponentType.WHOLE_BLOOD)
    volume_ml = models.PositiveIntegerField(default=450)
    collection_date = models.DateField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=20, choices=UnitStatus.choices, default=UnitStatus.QUARANTINED)
    screening_passed = models.BooleanField(null=True, blank=True, help_text="Null until screened.")
    screening_notes = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    class Meta:
        db_table = "blood_units"
        ordering = ["expiry_date"]

    def save(self, *args, **kwargs):
        if not self.unit_number:
            from .utils import generate_unit_number
            self.unit_number = generate_unit_number()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return self.expiry_date < date.today()

    @property
    def days_until_expiry(self):
        return (self.expiry_date - date.today()).days

    def __str__(self):
        return f"{self.unit_number} - {self.blood_group} {self.component_type}"


class RequestPriority(models.TextChoices):
    EMERGENCY = "EMERGENCY", "Emergency"
    URGENT = "URGENT", "Urgent"
    ROUTINE = "ROUTINE", "Routine"


class RequestStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CROSS_MATCHED = "CROSS_MATCHED", "Cross-Matched"
    ISSUED = "ISSUED", "Issued"
    CANCELLED = "CANCELLED", "Cancelled"
    REJECTED = "REJECTED", "Rejected - Incompatible"


class BloodRequest(BaseModel):
    request_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="blood_requests")
    patient_blood_group = models.CharField(max_length=5, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices, default=ComponentType.WHOLE_BLOOD)
    units_requested = models.PositiveSmallIntegerField(default=1)
    priority = models.CharField(max_length=20, choices=RequestPriority.choices, default=RequestPriority.ROUTINE)
    clinical_indication = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING)

    # Optional back-links to whichever module needs the blood.
    admission = models.ForeignKey("inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_requests")
    emergency_visit = models.ForeignKey("emergency.EmergencyVisit", null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_requests")
    surgery = models.ForeignKey("theatre.Surgery", null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_requests")
    delivery_record = models.ForeignKey("mch.DeliveryRecord", null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_requests")

    requested_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="blood_requests_made")
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "blood_requests"
        ordering = ["-requested_at"]

    def save(self, *args, **kwargs):
        if not self.request_number:
            from .utils import generate_request_number
            self.request_number = generate_request_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_number} - {self.patient.full_name} ({self.patient_blood_group})"


class BloodIssue(BaseModel):
    """One row per unit actually issued against a request."""
    request = models.ForeignKey(BloodRequest, on_delete=models.CASCADE, related_name="issues")
    unit = models.OneToOneField(BloodUnit, on_delete=models.PROTECT, related_name="issue")
    cross_match_compatible = models.BooleanField(default=True)
    issued_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="blood_units_issued")
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="blood_issues")
    issued_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "blood_issues"

    def __str__(self):
        return f"{self.unit.unit_number} issued for {self.request.request_number}"