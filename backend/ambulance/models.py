from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Patient, Invoice, InvoiceSourceType


class AmbulanceType(models.TextChoices):
    BASIC = "BASIC", "Basic Life Support (BLS)"
    ADVANCED = "ADVANCED", "Advanced Life Support (ALS)"
    NEONATAL = "NEONATAL", "Neonatal / ICU Transport"
    PATIENT_TRANSPORT = "PATIENT_TRANSPORT", "Non-Emergency Patient Transport"


class AmbulanceStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    ON_CALL = "ON_CALL", "On Call / Dispatched"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE", "Under Maintenance"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"


class Ambulance(BaseModel):
    registration_number = models.CharField(max_length=20, unique=True)
    ambulance_type = models.CharField(max_length=20, choices=AmbulanceType.choices, default=AmbulanceType.BASIC)
    make_model = models.CharField(max_length=100, blank=True)
    capacity = models.PositiveSmallIntegerField(default=1, help_text="Number of patients it can carry.")
    base_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Flat callout fee.")
    rate_per_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=AmbulanceStatus.choices, default=AmbulanceStatus.AVAILABLE)
    current_location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ambulances"

    def __str__(self):
        return f"{self.registration_number} ({self.ambulance_type})"


class CrewRole(models.TextChoices):
    DRIVER = "DRIVER", "Driver"
    PARAMEDIC = "PARAMEDIC", "Paramedic"
    NURSE = "NURSE", "Nurse"


class AmbulanceCrewMember(BaseModel):
    """Standing crew assignment — who's normally assigned to a vehicle, distinct from who was actually on a given dispatch (see DispatchCrewMember)."""
    ambulance = models.ForeignKey(Ambulance, on_delete=models.CASCADE, related_name="crew_members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ambulance_crew_assignments")
    role = models.CharField(max_length=20, choices=CrewRole.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ambulance_crew_members"
        unique_together = ("ambulance", "user", "role")

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role} ({self.ambulance.registration_number})"


class DispatchType(models.TextChoices):
    EMERGENCY_PICKUP = "EMERGENCY_PICKUP", "Emergency Pickup"
    INTER_FACILITY_TRANSFER = "INTER_FACILITY_TRANSFER", "Inter-Facility Transfer"
    DISCHARGE_TRANSPORT = "DISCHARGE_TRANSPORT", "Discharge Transport"
    OTHER = "OTHER", "Other"


class DispatchStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    DISPATCHED = "DISPATCHED", "Dispatched / En Route to Pickup"
    PATIENT_ONBOARD = "PATIENT_ONBOARD", "Patient Onboard / En Route to Destination"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class AmbulanceDispatch(BaseModel):
    dispatch_number = models.CharField(max_length=30, unique=True, editable=False)
    ambulance = models.ForeignKey(Ambulance, null=True, blank=True, on_delete=models.SET_NULL, related_name="dispatches")

    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="ambulance_dispatches")
    patient_name_freetext = models.CharField(max_length=150, blank=True, help_text="Used when the patient isn't registered yet (unknown emergency pickup).")
    contact_phone = models.CharField(max_length=20, blank=True)

    dispatch_type = models.CharField(max_length=30, choices=DispatchType.choices, default=DispatchType.EMERGENCY_PICKUP)
    pickup_location = models.CharField(max_length=255)
    destination = models.CharField(max_length=255, default="Facility")
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    status = models.CharField(max_length=20, choices=DispatchStatus.choices, default=DispatchStatus.REQUESTED)
    requested_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dispatches_requested")

    requested_at = models.DateTimeField(auto_now_add=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="ambulance_dispatches")

    # Links onward into other modules if this dispatch feeds into one.
    emergency_visit = models.ForeignKey(
        "emergency.EmergencyVisit", null=True, blank=True, on_delete=models.SET_NULL, related_name="ambulance_dispatch"
    )

    class Meta:
        db_table = "ambulance_dispatches"
        ordering = ["-requested_at"]

    def save(self, *args, **kwargs):
        if not self.dispatch_number:
            from .utils import generate_dispatch_number
            self.dispatch_number = generate_dispatch_number()
        super().save(*args, **kwargs)

    @property
    def patient_display_name(self):
        return self.patient.full_name if self.patient else (self.patient_name_freetext or "Unknown / Unregistered")

    def __str__(self):
        return f"{self.dispatch_number} - {self.patient_display_name}"


class DispatchCrewMember(BaseModel):
    """Who actually rode on this specific dispatch — may differ from the vehicle's standing crew."""
    dispatch = models.ForeignKey(AmbulanceDispatch, on_delete=models.CASCADE, related_name="crew")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="dispatches_crewed")
    role = models.CharField(max_length=20, choices=CrewRole.choices)

    class Meta:
        db_table = "dispatch_crew_members"
        unique_together = ("dispatch", "user")


class AmbulanceMaintenanceType(models.TextChoices):
    SERVICE = "SERVICE", "Routine Service"
    REPAIR = "REPAIR", "Repair"
    INSPECTION = "INSPECTION", "Inspection"


class AmbulanceMaintenanceLog(BaseModel):
    ambulance = models.ForeignKey(Ambulance, on_delete=models.CASCADE, related_name="maintenance_logs")
    maintenance_type = models.CharField(max_length=20, choices=AmbulanceMaintenanceType.choices, default=AmbulanceMaintenanceType.SERVICE)
    service_date = models.DateField()
    odometer_reading = models.PositiveIntegerField(null=True, blank=True)
    vendor = models.CharField(max_length=150, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    logged_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="ambulance_maintenance_logged")

    class Meta:
        db_table = "ambulance_maintenance_logs"
        ordering = ["-service_date"]

    def __str__(self):
        return f"{self.ambulance.registration_number} - {self.maintenance_type} ({self.service_date})"