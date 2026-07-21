from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


# FDI (ISO 3950) tooth numbering — two-digit codes, quadrant + tooth position.
FDI_TOOTH_CHOICES = [(str(n), str(n)) for n in (
    list(range(11, 19)) + list(range(21, 29)) + list(range(31, 39)) + list(range(41, 49))
)]


class DentalProcedureCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "dental_procedure_catalog"

    def __str__(self):
        return self.name


class DentalVisit(BaseModel):
    visit_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="dental_visits")
    visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="dental_visits")
    dentist = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="dental_visits_attended")
    chief_complaint = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dental_visits_registered")
    visit_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "dental_visits"
        ordering = ["-visit_date"]

    def save(self, *args, **kwargs):
        if not self.visit_number:
            from .utils import generate_dental_visit_number
            self.visit_number = generate_dental_visit_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.visit_number} - {self.patient.full_name}"


class ToothCondition(models.TextChoices):
    HEALTHY = "HEALTHY", "Healthy"
    CARIES = "CARIES", "Caries / Decay"
    FILLED = "FILLED", "Filled"
    CROWNED = "CROWNED", "Crowned"
    MISSING = "MISSING", "Missing"
    IMPACTED = "IMPACTED", "Impacted"
    FRACTURED = "FRACTURED", "Fractured"
    ROOT_CANAL_TREATED = "ROOT_CANAL_TREATED", "Root Canal Treated"


class ToothChart(BaseModel):
    """One row per tooth examined in a given dental visit — the chart is built incrementally as teeth are examined."""
    dental_visit = models.ForeignKey(DentalVisit, on_delete=models.CASCADE, related_name="tooth_chart")
    tooth_number = models.CharField(max_length=2, choices=FDI_TOOTH_CHOICES)
    condition = models.CharField(max_length=30, choices=ToothCondition.choices, default=ToothCondition.HEALTHY)
    notes = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="tooth_chart_entries")

    class Meta:
        db_table = "tooth_chart"
        unique_together = ("dental_visit", "tooth_number")

    def __str__(self):
        return f"Tooth {self.tooth_number} - {self.condition} ({self.dental_visit.visit_number})"


class TreatmentPlanStatus(models.TextChoices):
    PLANNED = "PLANNED", "Planned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class DentalTreatmentPlan(BaseModel):
    dental_visit = models.ForeignKey(DentalVisit, on_delete=models.CASCADE, related_name="treatment_plans")
    tooth_number = models.CharField(max_length=2, choices=FDI_TOOTH_CHOICES, blank=True, help_text="Blank for whole-mouth procedures like scaling.")
    procedure = models.ForeignKey(DentalProcedureCatalog, on_delete=models.PROTECT, related_name="treatment_plans")
    sequence = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=TreatmentPlanStatus.choices, default=TreatmentPlanStatus.PLANNED)
    notes = models.TextField(blank=True)
    planned_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dental_plans_created")

    class Meta:
        db_table = "dental_treatment_plans"
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.procedure.name} - Tooth {self.tooth_number or 'N/A'} ({self.dental_visit.visit_number})"


class DentalProcedureRecord(BaseModel):
    """A procedure actually performed and billed — created when a treatment plan item is executed."""
    treatment_plan = models.OneToOneField(DentalTreatmentPlan, on_delete=models.CASCADE, related_name="procedure_record")
    performed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dental_procedures_performed")
    performed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="dental_procedures")

    class Meta:
        db_table = "dental_procedure_records"

    def __str__(self):
        return f"Performed - {self.treatment_plan}"