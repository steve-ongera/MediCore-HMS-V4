from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Medicine, Invoice, InvoiceSourceType


class TheatreStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    IN_USE = "IN_USE", "In Use"
    CLEANING = "CLEANING", "Cleaning / Turnover"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"


class OperatingTheatre(BaseModel):
    theatre_number = models.CharField(max_length=20, unique=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=TheatreStatus.choices, default=TheatreStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "operating_theatres"

    def __str__(self):
        return f"Theatre {self.theatre_number}"


class SurgicalProcedureCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    base_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    estimated_duration_minutes = models.PositiveSmallIntegerField(default=60)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "surgical_procedure_catalog"

    def __str__(self):
        return self.name


class BookingPriority(models.TextChoices):
    EMERGENCY = "EMERGENCY", "Emergency"
    URGENT = "URGENT", "Urgent"
    ELECTIVE = "ELECTIVE", "Elective"


class BookingStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    CONFIRMED = "CONFIRMED", "Confirmed"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    POSTPONED = "POSTPONED", "Postponed"


class SurgeryBooking(BaseModel):
    booking_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="surgery_bookings")
    procedure = models.ForeignKey(SurgicalProcedureCatalog, on_delete=models.PROTECT, related_name="bookings")
    priority = models.CharField(max_length=20, choices=BookingPriority.choices, default=BookingPriority.ELECTIVE)
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.REQUESTED)

    requested_date = models.DateTimeField()
    theatre = models.ForeignKey(OperatingTheatre, null=True, blank=True, on_delete=models.SET_NULL, related_name="bookings")

    primary_surgeon = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="surgeries_as_primary_surgeon")
    diagnosis = models.TextField(blank=True)
    pre_op_notes = models.TextField(blank=True)

    admission = models.ForeignKey("inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="surgery_bookings")
    emergency_visit = models.ForeignKey("emergency.EmergencyVisit", null=True, blank=True, on_delete=models.SET_NULL, related_name="surgery_bookings")

    requested_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="surgery_bookings_requested")
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        db_table = "surgery_bookings"
        ordering = ["-requested_date"]

    def save(self, *args, **kwargs):
        if not self.booking_number:
            from .utils import generate_booking_number
            self.booking_number = generate_booking_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_number} - {self.patient.full_name} ({self.procedure.name})"


class SurgeryStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    ABANDONED = "ABANDONED", "Abandoned"


class SurgeryOutcome(models.TextChoices):
    SUCCESSFUL = "SUCCESSFUL", "Successful"
    COMPLICATIONS = "COMPLICATIONS", "Completed with Complications"
    DECEASED = "DECEASED", "Patient Deceased"


class Surgery(BaseModel):
    """The actual operative episode, opened once a SurgeryBooking is taken into theatre."""
    booking = models.OneToOneField(SurgeryBooking, on_delete=models.CASCADE, related_name="surgery")
    theatre = models.ForeignKey(OperatingTheatre, on_delete=models.PROTECT, related_name="surgeries")

    theatre_in_at = models.DateTimeField(auto_now_add=True)
    incision_at = models.DateTimeField(null=True, blank=True)
    closure_at = models.DateTimeField(null=True, blank=True)
    theatre_out_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=SurgeryStatus.choices, default=SurgeryStatus.IN_PROGRESS)
    outcome = models.CharField(max_length=20, choices=SurgeryOutcome.choices, blank=True)
    operative_notes = models.TextField(blank=True)
    complications = models.TextField(blank=True)
    estimated_blood_loss_ml = models.PositiveIntegerField(null=True, blank=True)

    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="surgeries")

    class Meta:
        db_table = "surgeries"

    @property
    def duration_hours(self):
        from django.utils import timezone
        end = self.theatre_out_at or timezone.now()
        return round(max((end - self.theatre_in_at).total_seconds() / 3600, 0), 2)

    def __str__(self):
        return f"Surgery - {self.booking.booking_number}"


class TeamRole(models.TextChoices):
    PRIMARY_SURGEON = "PRIMARY_SURGEON", "Primary Surgeon"
    ASSISTANT_SURGEON = "ASSISTANT_SURGEON", "Assistant Surgeon"
    ANESTHETIST = "ANESTHETIST", "Anesthetist"
    SCRUB_NURSE = "SCRUB_NURSE", "Scrub Nurse"
    CIRCULATING_NURSE = "CIRCULATING_NURSE", "Circulating Nurse"
    OTHER = "OTHER", "Other"


class SurgicalTeamMember(BaseModel):
    surgery = models.ForeignKey(Surgery, on_delete=models.CASCADE, related_name="team")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="surgical_team_assignments")
    role = models.CharField(max_length=30, choices=TeamRole.choices)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Billable professional fee for this role, if separately charged.")

    class Meta:
        db_table = "surgical_team_members"
        unique_together = ("surgery", "user", "role")

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role} ({self.surgery})"


class ConsumableUsage(BaseModel):
    """Medicines/consumables used intra-op. Deducts stock via the same MedicineBatch/StockTransaction machinery as PharmacyDispense."""
    surgery = models.ForeignKey(Surgery, on_delete=models.CASCADE, related_name="consumables_used")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="theatre_usages")
    batch = models.ForeignKey("api.MedicineBatch", null=True, blank=True, on_delete=models.SET_NULL, related_name="theatre_usages")
    quantity = models.PositiveIntegerField()
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="theatre_consumables")
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="consumables_recorded")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "theatre_consumable_usage"

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity} - {self.surgery}"


class PostOpNote(BaseModel):
    surgery = models.ForeignKey(Surgery, on_delete=models.CASCADE, related_name="post_op_notes")
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="post_op_notes_recorded")
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    pulse_bpm = models.PositiveSmallIntegerField(null=True, blank=True)
    oxygen_saturation = models.PositiveSmallIntegerField(null=True, blank=True)
    consciousness_level = models.CharField(max_length=100, blank=True)
    pain_score = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "post_op_notes"
        ordering = ["recorded_at"]

    def __str__(self):
        return f"Post-op note - {self.surgery} @ {self.recorded_at}"