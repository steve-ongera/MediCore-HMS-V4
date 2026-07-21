from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class EyeProcedureCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "eye_procedure_catalog"

    def __str__(self):
        return self.name


class EyeVisit(BaseModel):
    visit_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="eye_visits")
    visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="eye_visits")
    ophthalmologist = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="eye_visits_attended")
    chief_complaint = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="eye_visits_registered")
    visit_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eye_visits"
        ordering = ["-visit_date"]

    def save(self, *args, **kwargs):
        if not self.visit_number:
            from .utils import generate_eye_visit_number
            self.visit_number = generate_eye_visit_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.visit_number} - {self.patient.full_name}"


class EyeExamination(BaseModel):
    """One exam per visit, both eyes recorded side by side (OD = right, OS = left, standard ophthalmology notation)."""
    eye_visit = models.OneToOneField(EyeVisit, on_delete=models.CASCADE, related_name="examination")

    # Visual acuity, Snellen notation, e.g. "6/6", "6/12", "CF" (counting fingers), "HM" (hand movement)
    visual_acuity_od = models.CharField(max_length=20, blank=True, verbose_name="Visual Acuity (Right Eye - OD)")
    visual_acuity_os = models.CharField(max_length=20, blank=True, verbose_name="Visual Acuity (Left Eye - OS)")

    # Intraocular pressure, mmHg
    iop_od = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="IOP (Right Eye - OD, mmHg)")
    iop_os = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="IOP (Left Eye - OS, mmHg)")

    # Refraction — sphere / cylinder / axis, per eye
    sphere_od = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cylinder_od = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    axis_od = models.PositiveSmallIntegerField(null=True, blank=True)
    sphere_os = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cylinder_os = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    axis_os = models.PositiveSmallIntegerField(null=True, blank=True)

    anterior_segment_notes = models.TextField(blank=True)
    posterior_segment_notes = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)

    examined_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="eye_examinations_conducted")
    examined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eye_examinations"

    def __str__(self):
        return f"Exam - {self.eye_visit.visit_number}"


class LensType(models.TextChoices):
    SINGLE_VISION = "SINGLE_VISION", "Single Vision"
    BIFOCAL = "BIFOCAL", "Bifocal"
    PROGRESSIVE = "PROGRESSIVE", "Progressive"
    READING = "READING", "Reading Only"


class SpectaclePrescription(BaseModel):
    eye_visit = models.ForeignKey(EyeVisit, on_delete=models.CASCADE, related_name="spectacle_prescriptions")
    lens_type = models.CharField(max_length=20, choices=LensType.choices, default=LensType.SINGLE_VISION)

    sphere_od = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cylinder_od = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    axis_od = models.PositiveSmallIntegerField(null=True, blank=True)
    add_od = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text="Reading addition, for bifocal/progressive.")

    sphere_os = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cylinder_os = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    axis_os = models.PositiveSmallIntegerField(null=True, blank=True)
    add_os = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    pupillary_distance_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    prescribed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="spectacle_prescriptions_made")
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="spectacle_prescriptions")
    prescribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "spectacle_prescriptions"

    def __str__(self):
        return f"Prescription - {self.eye_visit.visit_number}"


class EyeTreatmentPlanStatus(models.TextChoices):
    PLANNED = "PLANNED", "Planned"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class EyeTreatmentPlan(BaseModel):
    eye_visit = models.ForeignKey(EyeVisit, on_delete=models.CASCADE, related_name="treatment_plans")
    procedure = models.ForeignKey(EyeProcedureCatalog, on_delete=models.PROTECT, related_name="treatment_plans")
    eye = models.CharField(max_length=10, choices=[("OD", "Right Eye (OD)"), ("OS", "Left Eye (OS)"), ("BOTH", "Both Eyes")], default="BOTH")
    status = models.CharField(max_length=20, choices=EyeTreatmentPlanStatus.choices, default=EyeTreatmentPlanStatus.PLANNED)
    notes = models.TextField(blank=True)
    planned_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="eye_plans_created")

    class Meta:
        db_table = "eye_treatment_plans"

    def __str__(self):
        return f"{self.procedure.name} ({self.eye}) - {self.eye_visit.visit_number}"


class EyeProcedureRecord(BaseModel):
    treatment_plan = models.OneToOneField(EyeTreatmentPlan, on_delete=models.CASCADE, related_name="procedure_record")
    performed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="eye_procedures_performed")
    performed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="eye_procedures")

    class Meta:
        db_table = "eye_procedure_records"

    def __str__(self):
        return f"Performed - {self.treatment_plan}"