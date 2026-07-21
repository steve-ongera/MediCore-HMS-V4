from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class ICUBedStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    OCCUPIED = "OCCUPIED", "Occupied"
    CLEANING = "CLEANING", "Cleaning / Turnover"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"


class ICUUnitType(models.TextChoices):
    ICU = "ICU", "Intensive Care Unit"
    HDU = "HDU", "High Dependency Unit"
    NICU = "NICU", "Neonatal ICU"
    PICU = "PICU", "Pediatric ICU"


class ICUBed(BaseModel):
    bed_number = models.CharField(max_length=20, unique=True)
    unit_type = models.CharField(max_length=10, choices=ICUUnitType.choices, default=ICUUnitType.ICU)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    has_ventilator = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=ICUBedStatus.choices, default=ICUBedStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "icu_beds"

    def __str__(self):
        return f"{self.unit_type} - Bed {self.bed_number}"


class AdmissionReason(models.TextChoices):
    RESPIRATORY_FAILURE = "RESPIRATORY_FAILURE", "Respiratory Failure"
    SEPSIS = "SEPSIS", "Sepsis / Septic Shock"
    POST_SURGICAL = "POST_SURGICAL", "Post-Surgical Monitoring"
    TRAUMA = "TRAUMA", "Trauma"
    CARDIAC = "CARDIAC", "Cardiac Event"
    NEUROLOGICAL = "NEUROLOGICAL", "Neurological Event"
    OTHER = "OTHER", "Other"


class ICUAdmissionStatus(models.TextChoices):
    ADMITTED = "ADMITTED", "In ICU/HDU"
    STEPPED_DOWN = "STEPPED_DOWN", "Stepped Down to Ward"
    DISCHARGED_HOME = "DISCHARGED_HOME", "Discharged Home"
    DECEASED = "DECEASED", "Deceased"
    TRANSFERRED_OUT = "TRANSFERRED_OUT", "Transferred to Another Facility"


class ICUAdmission(BaseModel):
    icu_admission_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="icu_admissions")

    # Optional link to an existing ward admission this ICU stay is nested within
    # (e.g. patient was on Ward 3, deteriorated, moved to ICU).
    ward_admission = models.ForeignKey("inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="icu_episodes")

    bed = models.ForeignKey(ICUBed, on_delete=models.PROTECT, related_name="admissions")
    admission_reason = models.CharField(max_length=30, choices=AdmissionReason.choices, default=AdmissionReason.OTHER)
    admission_diagnosis = models.TextField(blank=True)

    # APACHE II / SOFA-style severity score, tracked as a plain integer — the
    # specific scoring system used is a clinical choice, not enforced here.
    severity_score = models.PositiveSmallIntegerField(null=True, blank=True, help_text="e.g. APACHE II or SOFA score at admission.")

    attending_physician = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="icu_admissions_attending")
    admitted_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="icu_admissions_recorded")

    status = models.CharField(max_length=20, choices=ICUAdmissionStatus.choices, default=ICUAdmissionStatus.ADMITTED)
    admitted_at = models.DateTimeField(auto_now_add=True)
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharge_summary = models.TextField(blank=True)

    class Meta:
        db_table = "icu_admissions"
        ordering = ["-admitted_at"]

    def save(self, *args, **kwargs):
        if not self.icu_admission_number:
            from .utils import generate_icu_admission_number
            self.icu_admission_number = generate_icu_admission_number()
        super().save(*args, **kwargs)

    @property
    def length_of_stay_days(self):
        from django.utils import timezone
        end = self.discharged_at or timezone.now()
        return max((end - self.admitted_at).days, 1)

    def __str__(self):
        return f"{self.icu_admission_number} - {self.patient.full_name}"


class ICUVitalsMonitoring(BaseModel):
    """Frequent vitals — hourly/continuous, distinct from inpatient's shift-based vitals."""
    icu_admission = models.ForeignKey(ICUAdmission, on_delete=models.CASCADE, related_name="vitals")
    recorded_at = models.DateTimeField(auto_now_add=True)

    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    mean_arterial_pressure = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    oxygen_saturation = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    gcs_score = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="GCS Score")
    urine_output_ml = models.PositiveIntegerField(null=True, blank=True, help_text="Per hour, ml.")
    central_venous_pressure = models.PositiveSmallIntegerField(null=True, blank=True)

    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="icu_vitals_recorded")

    class Meta:
        db_table = "icu_vitals_monitoring"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"ICU Vitals - {self.icu_admission.icu_admission_number} @ {self.recorded_at}"


class VentilatorMode(models.TextChoices):
    NONE = "NONE", "Not Ventilated"
    CPAP = "CPAP", "CPAP"
    BIPAP = "BIPAP", "BiPAP"
    AC = "AC", "Assist Control (AC)"
    SIMV = "SIMV", "SIMV"
    PSV = "PSV", "Pressure Support (PSV)"


class VentilatorSettings(BaseModel):
    icu_admission = models.ForeignKey(ICUAdmission, on_delete=models.CASCADE, related_name="ventilator_settings")
    recorded_at = models.DateTimeField(auto_now_add=True)
    mode = models.CharField(max_length=10, choices=VentilatorMode.choices, default=VentilatorMode.NONE)
    fio2_percent = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Fraction of inspired oxygen, %.")
    peep_cmh2o = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="PEEP (cmH2O)")
    tidal_volume_ml = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate_set = models.PositiveSmallIntegerField(null=True, blank=True)
    peak_pressure = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="ventilator_settings_recorded")

    class Meta:
        db_table = "ventilator_settings"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"Vent Settings - {self.icu_admission.icu_admission_number} @ {self.recorded_at}"


class ICUProcedureCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "icu_procedure_catalog"

    def __str__(self):
        return self.name


class ICUProcedureRecord(BaseModel):
    icu_admission = models.ForeignKey(ICUAdmission, on_delete=models.CASCADE, related_name="procedures")
    procedure = models.ForeignKey(ICUProcedureCatalog, on_delete=models.PROTECT, related_name="records")
    performed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="icu_procedures_performed")
    performed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="icu_procedures")

    class Meta:
        db_table = "icu_procedure_records"

    def __str__(self):
        return f"{self.procedure.name} - {self.icu_admission.icu_admission_number}"


class ICUBedCharge(BaseModel):
    """One row per daily bed charge — same pattern as inpatient BedCharge."""
    icu_admission = models.ForeignKey(ICUAdmission, on_delete=models.CASCADE, related_name="bed_charges")
    bed = models.ForeignKey(ICUBed, on_delete=models.PROTECT, related_name="charges")
    charge_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="icu_bed_charges")

    class Meta:
        db_table = "icu_bed_charges"
        unique_together = ("icu_admission", "charge_date")

    def __str__(self):
        return f"ICU Bed Charge - {self.icu_admission.icu_admission_number} ({self.charge_date})"