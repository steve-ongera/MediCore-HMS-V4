from django.db import models
from django.core.validators import MinValueValidator
from api.models import BaseModel, User, Department


class DoctorProfile(BaseModel):
    """Extended profile for a User with role=DOCTOR — specialty, qualifications, consultation fee override, commission rate."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.CharField(max_length=150, blank=True)
    qualifications = models.TextField(blank=True, help_text="Degrees, certifications, e.g. MBChB, MMed Surgery.")
    license_number = models.CharField(max_length=100, blank=True, help_text="Medical practice license/registration number.")
    years_of_experience = models.PositiveSmallIntegerField(null=True, blank=True)
    bio = models.TextField(blank=True)

    consultation_fee_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Overrides the department's default consultation fee for this specific doctor, if set."
    )
    commission_rate_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Percentage of consultation/procedure revenue this doctor earns as commission."
    )
    is_available_for_booking = models.BooleanField(default=True)

    class Meta:
        db_table = "doctor_profiles"

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.specialty or 'General'}"


class DayOfWeek(models.TextChoices):
    MONDAY = "MON", "Monday"
    TUESDAY = "TUE", "Tuesday"
    WEDNESDAY = "WED", "Wednesday"
    THURSDAY = "THU", "Thursday"
    FRIDAY = "FRI", "Friday"
    SATURDAY = "SAT", "Saturday"
    SUNDAY = "SUN", "Sunday"


class DoctorSchedule(BaseModel):
    """Weekly recurring availability — one row per day the doctor is scheduled to see patients."""
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="schedules")
    day_of_week = models.CharField(max_length=3, choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="doctor_schedules")
    max_patients = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Optional cap on patients seen in this slot.")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "doctor_schedules"
        unique_together = ("doctor", "day_of_week", "start_time")
        ordering = ["day_of_week", "start_time"]

    def __str__(self):
        return f"{self.doctor} - {self.day_of_week} {self.start_time}-{self.end_time}"


class HolidayStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class DoctorHoliday(BaseModel):
    """Time off / unavailability — distinct from HR's general staff leave (hr.LeaveRequest), since this specifically blocks the doctor's booking calendar."""
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="holidays")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=HolidayStatus.choices, default=HolidayStatus.REQUESTED)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="doctor_holidays_approved")
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "doctor_holidays"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.doctor} - {self.start_date} to {self.end_date} ({self.status})"


class CommissionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    PAID = "PAID", "Paid"


class DoctorCommission(BaseModel):
    """
    One row per consultation/procedure the doctor earned commission on —
    computed from the consultation_fee_override or department fee at
    commission_rate_percent. Links back to the real Consultation record
    rather than duplicating billing data.
    """
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="commissions")
    consultation = models.ForeignKey("api.Consultation", null=True, blank=True, on_delete=models.SET_NULL, related_name="commission_record")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="doctor_commission")
    amount_earned = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=CommissionStatus.choices, default=CommissionStatus.PENDING)
    period_month = models.PositiveSmallIntegerField()
    period_year = models.PositiveSmallIntegerField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "doctor_commissions"
        ordering = ["-created_at_display"]

    def __str__(self):
        return f"{self.doctor} - KES {self.amount_earned} ({self.status})"