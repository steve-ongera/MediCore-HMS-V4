from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class MachineStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    IN_USE = "IN_USE", "In Use"
    MAINTENANCE = "MAINTENANCE", "Under Maintenance"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"


class DialysisMachine(BaseModel):
    machine_number = models.CharField(max_length=20, unique=True)
    make_model = models.CharField(max_length=150, blank=True)
    rate_per_session = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=MachineStatus.choices, default=MachineStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "dialysis_machines"

    def __str__(self):
        return f"Machine {self.machine_number}"


class VascularAccessType(models.TextChoices):
    AV_FISTULA = "AV_FISTULA", "Arteriovenous (AV) Fistula"
    AV_GRAFT = "AV_GRAFT", "Arteriovenous (AV) Graft"
    CENTRAL_CATHETER = "CENTRAL_CATHETER", "Central Venous Catheter"
    PERITONEAL = "PERITONEAL", "Peritoneal Dialysis Catheter"


class DialysisPatientStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    TRANSFERRED = "TRANSFERRED", "Transferred to Another Facility"
    TRANSPLANTED = "TRANSPLANTED", "Received Transplant"
    DECEASED = "DECEASED", "Deceased"
    DISCONTINUED = "DISCONTINUED", "Discontinued"


class DialysisPatientProfile(BaseModel):
    """Standing chronic-care record — one per patient, generates repeated sessions."""
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="dialysis_profile")
    profile_number = models.CharField(max_length=30, unique=True, editable=False)

    primary_diagnosis = models.TextField(blank=True, help_text="e.g. ESRD secondary to diabetic nephropathy.")
    dry_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    vascular_access_type = models.CharField(max_length=30, choices=VascularAccessType.choices, default=VascularAccessType.AV_FISTULA)
    access_site_notes = models.CharField(max_length=255, blank=True)

    sessions_per_week = models.PositiveSmallIntegerField(default=3)
    session_duration_hours = models.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    dialyzer_type = models.CharField(max_length=100, blank=True)
    anticoagulation_protocol = models.CharField(max_length=100, blank=True)

    status = models.CharField(max_length=20, choices=DialysisPatientStatus.choices, default=DialysisPatientStatus.ACTIVE)
    nephrologist = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="dialysis_patients")
    started_on = models.DateField()
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dialysis_profiles_registered")

    class Meta:
        db_table = "dialysis_patient_profiles"

    def save(self, *args, **kwargs):
        if not self.profile_number:
            from .utils import generate_profile_number
            self.profile_number = generate_profile_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.profile_number} - {self.patient.full_name}"


class SessionStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    MISSED = "MISSED", "Missed / No-Show"
    CANCELLED = "CANCELLED", "Cancelled"


class DialysisSession(BaseModel):
    session_number = models.CharField(max_length=30, unique=True, editable=False)
    profile = models.ForeignKey(DialysisPatientProfile, on_delete=models.CASCADE, related_name="sessions")
    machine = models.ForeignKey(DialysisMachine, null=True, blank=True, on_delete=models.SET_NULL, related_name="sessions")

    scheduled_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=SessionStatus.choices, default=SessionStatus.SCHEDULED)

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    pre_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    post_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pre_bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    pre_bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    post_bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    post_bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)

    ultrafiltration_target_ml = models.PositiveIntegerField(null=True, blank=True)
    blood_flow_rate = models.PositiveSmallIntegerField(null=True, blank=True, help_text="ml/min")
    dialysate_flow_rate = models.PositiveSmallIntegerField(null=True, blank=True, help_text="ml/min")

    complications = models.TextField(blank=True)
    nursing_notes = models.TextField(blank=True)

    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="dialysis_sessions_performed")
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="dialysis_sessions")

    class Meta:
        db_table = "dialysis_sessions"
        ordering = ["-scheduled_date"]

    def save(self, *args, **kwargs):
        if not self.session_number:
            from .utils import generate_session_number
            self.session_number = generate_session_number()
        super().save(*args, **kwargs)

    @property
    def fluid_removed_kg(self):
        if self.pre_weight_kg is not None and self.post_weight_kg is not None:
            return self.pre_weight_kg - self.post_weight_kg
        return None

    def __str__(self):
        return f"{self.session_number} - {self.profile.patient.full_name}"


class VascularAccessCheck(BaseModel):
    profile = models.ForeignKey(DialysisPatientProfile, on_delete=models.CASCADE, related_name="access_checks")
    check_date = models.DateField()
    thrill_present = models.BooleanField(null=True, blank=True)
    bruit_present = models.BooleanField(null=True, blank=True)
    signs_of_infection = models.BooleanField(default=False)
    signs_of_stenosis = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    checked_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="vascular_access_checks")

    class Meta:
        db_table = "vascular_access_checks"
        ordering = ["-check_date"]

    def __str__(self):
        return f"Access check - {self.profile.patient.full_name} ({self.check_date})"