from django.db import models
from api.models import BaseModel, User, Patient, Department


class CarePlanStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"
    DISCONTINUED = "DISCONTINUED", "Discontinued"


class CarePlanSourceType(models.TextChoices):
    CONSULTATION = "CONSULTATION", "OPD Consultation"
    DISCHARGE = "DISCHARGE", "Inpatient Discharge"
    EMERGENCY = "EMERGENCY", "Emergency Visit"
    DELIVERY = "DELIVERY", "MCH Delivery"
    REFERRAL = "REFERRAL", "Referral"
    MANUAL = "MANUAL", "Manually Created"


class CarePlan(BaseModel):
    """
    The thread that follows a patient between encounters. Created from any
    clinical touchpoint (consultation, discharge, ED, delivery, referral)
    without duplicating the source record — just references it, and holds
    the ongoing plan of what needs to happen next.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="care_plans")
    title = models.CharField(max_length=255, help_text="e.g. 'Diabetes Management', 'Post-Op Wound Care', 'Hypertension Monitoring'.")
    condition = models.CharField(max_length=255, blank=True, help_text="Primary condition being managed, free text or ICD-10-linked via notes.")
    icd10_code = models.ForeignKey("api.ICD10Code", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")

    source_type = models.CharField(max_length=20, choices=CarePlanSourceType.choices, default=CarePlanSourceType.MANUAL)
    source_consultation = models.ForeignKey("api.Consultation", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")
    source_admission = models.ForeignKey("inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")
    source_emergency_visit = models.ForeignKey("emergency.EmergencyVisit", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")
    source_delivery = models.ForeignKey("mch.DeliveryRecord", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")
    source_referral = models.ForeignKey("medrecords.Referral", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")

    is_chronic = models.BooleanField(default=False, help_text="Chronic disease requiring ongoing monitoring (diabetes, hypertension, HIV, etc.) vs. a one-off follow-up.")
    status = models.CharField(max_length=20, choices=CarePlanStatus.choices, default=CarePlanStatus.ACTIVE)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="care_plans_created")
    responsible_doctor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans_responsible_for")
    responsible_department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="care_plans")

    created_at_display = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "care_plans"
        ordering = ["-created_at_display"]

    def __str__(self):
        return f"{self.title} - {self.patient.full_name} ({self.status})"


class FollowUpType(models.TextChoices):
    CLINIC_REVIEW = "CLINIC_REVIEW", "Clinic Review Appointment"
    PENDING_INVESTIGATION = "PENDING_INVESTIGATION", "Pending Investigation Result"
    SPECIALIST_REVIEW = "SPECIALIST_REVIEW", "Pending Specialist Review"
    REFERRAL_FOLLOWUP = "REFERRAL_FOLLOWUP", "Referral Follow-up"
    POST_DISCHARGE_CHECK = "POST_DISCHARGE_CHECK", "Post-Discharge Check-in"
    MEDICATION_REVIEW = "MEDICATION_REVIEW", "Medication Review"
    OUTREACH_CALL = "OUTREACH_CALL", "Patient Outreach / Phone Call"
    OTHER = "OTHER", "Other"


class FollowUpStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    DUE_TODAY = "DUE_TODAY", "Due Today"
    OVERDUE = "OVERDUE", "Overdue"
    COMPLETED = "COMPLETED", "Completed"
    MISSED = "MISSED", "Missed — Patient Did Not Return"
    CANCELLED = "CANCELLED", "Cancelled"
    ESCALATED = "ESCALATED", "Escalated"


class FollowUpTask(BaseModel):
    """
    The atomic unit of care coordination — one concrete thing that needs
    to happen by a certain date. A CarePlan can have many of these over
    time (each clinic visit generates a new one for the next review).
    """
    care_plan = models.ForeignKey(CarePlan, on_delete=models.CASCADE, related_name="tasks")
    task_type = models.CharField(max_length=30, choices=FollowUpType.choices, default=FollowUpType.CLINIC_REVIEW)
    description = models.CharField(max_length=255)

    due_date = models.DateField()
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_up_tasks_assigned")
    assigned_department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_up_tasks")

    status = models.CharField(max_length=20, choices=FollowUpStatus.choices, default=FollowUpStatus.PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_up_tasks_completed")
    outcome_notes = models.TextField(blank=True)

    # Links to the actual visit that resulted from this follow-up, once it happens.
    resulting_visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_up_task_origin")

    reminder_sent = models.BooleanField(default=False)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_up_tasks_escalated_to")

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="follow_up_tasks_created")
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "follow_up_tasks"
        ordering = ["due_date"]

    def __str__(self):
        return f"{self.description} - {self.care_plan.patient.full_name} (due {self.due_date})"


class CareMilestone(BaseModel):
    """
    A treatment milestone within a care plan — e.g. 'HbA1c target < 7%',
    'Wound fully healed', 'BP controlled below 140/90'. Distinct from
    FollowUpTask (a scheduled action) — a milestone is a clinical GOAL
    tracked over the life of the care plan, checked off as achieved.
    """
    care_plan = models.ForeignKey(CarePlan, on_delete=models.CASCADE, related_name="milestones")
    description = models.CharField(max_length=255)
    target_date = models.DateField(null=True, blank=True)
    is_achieved = models.BooleanField(default=False)
    achieved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "care_milestones"
        ordering = ["target_date"]

    def __str__(self):
        return f"{self.description} - {self.care_plan}"


class ChronicMonitoringReading(BaseModel):
    """
    For chronic disease care plans — periodic readings tracked over time
    (BP, blood glucose, weight, etc.) so a doctor sees a trend across
    visits, not just today's number. Generic key/value so it works for
    any chronic condition without needing a table per disease type.
    """
    care_plan = models.ForeignKey(CarePlan, on_delete=models.CASCADE, related_name="monitoring_readings")
    metric_name = models.CharField(max_length=100, help_text="e.g. 'Blood Glucose', 'Systolic BP', 'Weight'.")
    value = models.CharField(max_length=50)
    unit = models.CharField(max_length=20, blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="monitoring_readings_recorded")
    recorded_at = models.DateTimeField(auto_now_add=True)
    follow_up_task = models.ForeignKey(FollowUpTask, null=True, blank=True, on_delete=models.SET_NULL, related_name="readings_taken")

    class Meta:
        db_table = "chronic_monitoring_readings"
        ordering = ["recorded_at"]

    def __str__(self):
        return f"{self.metric_name}: {self.value}{self.unit} - {self.care_plan.patient.full_name}"