import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

from api.models import BaseModel, User, Patient


class BayZone(models.TextChoices):
    TRIAGE = "TRIAGE", "Triage"
    RESUSCITATION = "RESUSCITATION", "Resuscitation"
    GENERAL = "GENERAL", "General ED"
    OBSERVATION = "OBSERVATION", "Observation"


class BayStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    OCCUPIED = "OCCUPIED", "Occupied"
    CLEANING = "CLEANING", "Cleaning / Turnover"


class EmergencyBay(BaseModel):
    bay_number = models.CharField(max_length=20, unique=True)
    zone = models.CharField(max_length=20, choices=BayZone.choices, default=BayZone.GENERAL)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=BayStatus.choices, default=BayStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "emergency_bays"

    def __str__(self):
        return f"{self.zone} - Bay {self.bay_number}"


class TriageLevel(models.IntegerChoices):
    RESUSCITATION = 1, "1 - Resuscitation (Immediate)"
    EMERGENT = 2, "2 - Emergent (< 10 min)"
    URGENT = 3, "3 - Urgent (< 30 min)"
    LESS_URGENT = 4, "4 - Less Urgent (< 60 min)"
    NON_URGENT = 5, "5 - Non-Urgent"


class ArrivalMode(models.TextChoices):
    WALK_IN = "WALK_IN", "Walk-in"
    AMBULANCE = "AMBULANCE", "Ambulance"
    POLICE = "POLICE", "Police"
    REFERRAL = "REFERRAL", "Referral"
    OTHER = "OTHER", "Other"


class EmergencyStatus(models.TextChoices):
    IN_ED = "IN_ED", "In Emergency Department"
    ADMITTED = "ADMITTED", "Admitted to Ward"
    DISCHARGED = "DISCHARGED", "Discharged Home"
    TRANSFERRED_OUT = "TRANSFERRED_OUT", "Transferred to Another Facility"
    LAMA = "LAMA", "Left Against Medical Advice"
    DECEASED = "DECEASED", "Deceased"


class EmergencyVisit(BaseModel):
    visit_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="emergency_visits")
    visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_visits")
    bay = models.ForeignKey(EmergencyBay, null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_visits")

    triage_level = models.PositiveSmallIntegerField(choices=TriageLevel.choices, null=True, blank=True)
    arrival_mode = models.CharField(max_length=20, choices=ArrivalMode.choices, default=ArrivalMode.WALK_IN)
    chief_complaint = models.TextField(blank=True)

    attending_doctor = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_visits_attending"
    )
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="emergency_visits_registered")

    status = models.CharField(max_length=20, choices=EmergencyStatus.choices, default=EmergencyStatus.IN_ED)
    arrived_at = models.DateTimeField(auto_now_add=True)
    disposition_at = models.DateTimeField(null=True, blank=True)
    disposition_notes = models.TextField(blank=True)

    # Set when this ED encounter results in a ward admission.
    admission = models.ForeignKey(
        "inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_visits"
    )

    class Meta:
        db_table = "emergency_visits"

    def save(self, *args, **kwargs):
        if not self.visit_number:
            from .utils import generate_emergency_visit_number
            self.visit_number = generate_emergency_visit_number()
        super().save(*args, **kwargs)

    @property
    def duration_hours(self):
        end = self.disposition_at or timezone.now()
        seconds = (end - self.arrived_at).total_seconds()
        return max(seconds / 3600, 0)

    def __str__(self):
        return f"{self.visit_number} - {self.patient.full_name}"


class TriageVitals(BaseModel):
    emergency_visit = models.ForeignKey(EmergencyVisit, on_delete=models.CASCADE, related_name="vitals")
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    pulse_bpm = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    oxygen_saturation = models.PositiveSmallIntegerField(null=True, blank=True)
    gcs_score = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="GCS Score")
    pain_score = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="Pain Score (0-10)")
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="triage_vitals_recorded")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "triage_vitals"


class EmergencyNote(BaseModel):
    emergency_visit = models.ForeignKey(EmergencyVisit, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="emergency_notes_authored")
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "emergency_notes"
        ordering = ["created_at"]


class EmergencyProcedureCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "emergency_procedure_catalog"

    def __str__(self):
        return self.name


class EmergencyProcedureStatus(models.TextChoices):
    ORDERED = "ORDERED", "Ordered"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class EmergencyProcedure(BaseModel):
    emergency_visit = models.ForeignKey(EmergencyVisit, on_delete=models.CASCADE, related_name="procedures")
    procedure = models.ForeignKey(EmergencyProcedureCatalog, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=EmergencyProcedureStatus.choices, default=EmergencyProcedureStatus.ORDERED)
    notes = models.TextField(blank=True)
    ordered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="emergency_procedures_ordered")
    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_procedures_performed")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_procedures")
    ordered_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "emergency_procedures"

    def __str__(self):
        return f"{self.procedure.name} - {self.emergency_visit.visit_number}"


class EmergencyMedicationRoute(models.TextChoices):
    ORAL = "ORAL", "Oral"
    IV = "IV", "Intravenous"
    IM = "IM", "Intramuscular"
    SC = "SC", "Subcutaneous"
    OTHER = "OTHER", "Other"


class EmergencyMedicationOrder(BaseModel):
    emergency_visit = models.ForeignKey(EmergencyVisit, on_delete=models.CASCADE, related_name="medication_orders")
    medicine = models.ForeignKey("api.Medicine", on_delete=models.PROTECT, related_name="emergency_orders")
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=20, choices=EmergencyMedicationRoute.choices, default=EmergencyMedicationRoute.IV)
    quantity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    ordered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="emergency_medication_orders_placed")
    ordered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "emergency_medication_orders"


class EmergencyAdministrationStatus(models.TextChoices):
    GIVEN = "GIVEN", "Given"
    MISSED = "MISSED", "Missed"
    REFUSED = "REFUSED", "Refused"


class EmergencyMedicationAdministration(BaseModel):
    medication_order = models.ForeignKey(EmergencyMedicationOrder, on_delete=models.CASCADE, related_name="administrations")
    administered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="emergency_medications_administered")
    status = models.CharField(max_length=20, choices=EmergencyAdministrationStatus.choices, default=EmergencyAdministrationStatus.GIVEN)
    batch = models.ForeignKey("api.MedicineBatch", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_administrations")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_administrations")
    administered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "emergency_medication_administrations"


class EmergencyBayCharge(BaseModel):
    """
    Time-based bay charge — computed once at disposition (or on-demand for
    long-staying patients) as duration_hours * bay.hourly_rate. Unlike
    inpatient BedCharge (one row per day), this is one row per charging
    event since ED stays are typically hours, not days.
    """
    emergency_visit = models.ForeignKey(EmergencyVisit, on_delete=models.CASCADE, related_name="bay_charges")
    bay = models.ForeignKey(EmergencyBay, on_delete=models.PROTECT, related_name="charges")
    hours_charged = models.DecimalField(max_digits=6, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="emergency_bay_charges")
    charged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "emergency_bay_charges"