from datetime import date

from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class CompartmentStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    OCCUPIED = "OCCUPIED", "Occupied"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"


class MortuaryUnit(BaseModel):
    compartment_number = models.CharField(max_length=20, unique=True)
    daily_storage_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=CompartmentStatus.choices, default=CompartmentStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "mortuary_units"

    def __str__(self):
        return f"Compartment {self.compartment_number}"


class DeathSource(models.TextChoices):
    INPATIENT = "INPATIENT", "Inpatient Ward"
    EMERGENCY = "EMERGENCY", "Emergency Department"
    MCH = "MCH", "Maternal & Child Health"
    BROUGHT_IN_DEAD = "BROUGHT_IN_DEAD", "Brought in Dead (BID)"
    OTHER = "OTHER", "Other"


class MortuaryStatus(models.TextChoices):
    ADMITTED = "ADMITTED", "In Mortuary"
    RELEASED = "RELEASED", "Released"


class MortuaryAdmission(BaseModel):
    case_number = models.CharField(max_length=30, unique=True, editable=False)

    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_admissions")
    deceased_name_freetext = models.CharField(max_length=150, blank=True, help_text="Used when there's no Patient record (e.g. unidentified BID case).")
    gender = models.CharField(max_length=10, choices=[("MALE", "Male"), ("FEMALE", "Female"), ("UNKNOWN", "Unknown")], default="UNKNOWN")
    estimated_age = models.PositiveSmallIntegerField(null=True, blank=True)

    date_of_death = models.DateTimeField()
    cause_of_death = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=DeathSource.choices, default=DeathSource.OTHER)

    # Optional back-links to whichever module the death occurred in.
    admission = models.ForeignKey("inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_case")
    emergency_visit = models.ForeignKey("emergency.EmergencyVisit", null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_case")
    delivery_record = models.ForeignKey("mch.DeliveryRecord", null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_case")

    compartment = models.ForeignKey(MortuaryUnit, null=True, blank=True, on_delete=models.SET_NULL, related_name="admissions")
    brought_by = models.CharField(max_length=150, blank=True, help_text="Who delivered the body, e.g. ambulance crew, police, family.")
    police_ob_number = models.CharField(max_length=60, blank=True, help_text="Occurrence Book number, for BID / suspicious death cases.")

    status = models.CharField(max_length=20, choices=MortuaryStatus.choices, default=MortuaryStatus.ADMITTED)
    admitted_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="mortuary_admissions_recorded")
    admitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "mortuary_admissions"
        ordering = ["-admitted_at"]

    def save(self, *args, **kwargs):
        if not self.case_number:
            from .utils import generate_case_number
            self.case_number = generate_case_number()
        super().save(*args, **kwargs)

    @property
    def deceased_display_name(self):
        return self.patient.full_name if self.patient else (self.deceased_name_freetext or "Unidentified")

    @property
    def days_in_storage(self):
        from django.utils import timezone
        end = timezone.now()
        if hasattr(self, "release") and self.release.released_at:
            end = self.release.released_at
        days = (end - self.admitted_at).days
        return max(days, 1)  # minimum 1 day charge, standard mortuary practice

    def __str__(self):
        return f"{self.case_number} - {self.deceased_display_name}"


class MortuaryServiceCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "mortuary_service_catalog"

    def __str__(self):
        return self.name


class MortuaryServiceStatus(models.TextChoices):
    ORDERED = "ORDERED", "Ordered"
    COMPLETED = "COMPLETED", "Completed"


class MortuaryServiceRecord(BaseModel):
    mortuary_case = models.ForeignKey(MortuaryAdmission, on_delete=models.CASCADE, related_name="services")
    service = models.ForeignKey(MortuaryServiceCatalog, on_delete=models.PROTECT, related_name="records")
    status = models.CharField(max_length=20, choices=MortuaryServiceStatus.choices, default=MortuaryServiceStatus.ORDERED)
    notes = models.TextField(blank=True)
    ordered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="mortuary_services_ordered")
    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_services_performed")
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="mortuary_services")
    ordered_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "mortuary_service_records"

    def __str__(self):
        return f"{self.service.name} - {self.mortuary_case.case_number}"


class MortuaryCharge(BaseModel):
    """
    Storage/service invoices raised for this case — one-to-many, same
    pattern as inpatient BedCharge / mch DeliveryCharge, so multiple daily
    storage charges and service fees are all tracked individually.
    """
    mortuary_case = models.ForeignKey(MortuaryAdmission, on_delete=models.CASCADE, related_name="charges")
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="mortuary_charges")
    description = models.CharField(max_length=255)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "mortuary_charges"
        ordering = ["created_at_display"]

    def __str__(self):
        return f"{self.description} - {self.mortuary_case.case_number}"


class ReleaseRelationship(models.TextChoices):
    SPOUSE = "SPOUSE", "Spouse"
    CHILD = "CHILD", "Child"
    PARENT = "PARENT", "Parent"
    SIBLING = "SIBLING", "Sibling"
    OTHER_RELATIVE = "OTHER_RELATIVE", "Other Relative"
    UNDERTAKER = "UNDERTAKER", "Undertaker / Funeral Home"
    POLICE = "POLICE", "Police"
    OTHER = "OTHER", "Other"


class BodyRelease(BaseModel):
    """
    One-to-one — a body is released exactly once. Requires explicit
    next-of-kin/collector identification and a releasing staff member's
    sign-off, standard mortuary compliance practice.
    """
    mortuary_case = models.OneToOneField(MortuaryAdmission, on_delete=models.CASCADE, related_name="release")

    collector_name = models.CharField(max_length=150)
    collector_id_number = models.CharField(max_length=30, blank=True)
    collector_phone = models.CharField(max_length=20, blank=True)
    relationship = models.CharField(max_length=20, choices=ReleaseRelationship.choices)
    funeral_home = models.CharField(max_length=150, blank=True)
    burial_permit_number = models.CharField(max_length=60, blank=True)

    released_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="body_releases_processed")
    notes = models.TextField(blank=True)
    released_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "body_releases"

    def __str__(self):
        return f"Release - {self.mortuary_case.case_number} to {self.collector_name}"