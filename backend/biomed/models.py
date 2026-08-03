from django.db import models
from django.core.validators import MinValueValidator
from api.models import BaseModel, User, Supplier


class EquipmentCategory(models.TextChoices):
    DIAGNOSTIC = "DIAGNOSTIC", "Diagnostic"
    THERAPEUTIC = "THERAPEUTIC", "Therapeutic"
    LIFE_SUPPORT = "LIFE_SUPPORT", "Life Support"
    LABORATORY = "LABORATORY", "Laboratory"
    IMAGING = "IMAGING", "Imaging"
    STERILIZATION = "STERILIZATION", "Sterilization"
    OTHER = "OTHER", "Other"


class EquipmentStatus(models.TextChoices):
    OPERATIONAL = "OPERATIONAL", "Operational"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE", "Under Maintenance"
    OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"
    DECOMMISSIONED = "DECOMMISSIONED", "Decommissioned"
    AWAITING_PARTS = "AWAITING_PARTS", "Awaiting Parts"


class RiskClass(models.TextChoices):
    LOW = "LOW", "Low Risk"
    MEDIUM = "MEDIUM", "Medium Risk"
    HIGH = "HIGH", "High Risk (Life-Critical)"


class Equipment(BaseModel):
    """The equipment register — the source of truth for every biomedical asset in the hospital."""
    asset_tag = models.CharField(max_length=30, unique=True, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=EquipmentCategory.choices, default=EquipmentCategory.OTHER)
    manufacturer = models.CharField(max_length=150, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)

    department = models.CharField(max_length=150, blank=True, help_text="Physical location/department, e.g. ICU, Theatre 1, Radiology.")
    risk_class = models.CharField(max_length=10, choices=RiskClass.choices, default=RiskClass.MEDIUM)
    status = models.CharField(max_length=20, choices=EquipmentStatus.choices, default=EquipmentStatus.OPERATIONAL)

    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name="biomed_equipment")
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)

    preventive_maintenance_interval_days = models.PositiveSmallIntegerField(default=90, help_text="How often this equipment needs routine preventive maintenance.")
    calibration_interval_days = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Leave blank if this equipment doesn't require calibration.")

    is_active = models.BooleanField(default=True)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="equipment_registered")

    class Meta:
        db_table = "biomed_equipment"

    def save(self, *args, **kwargs):
        if not self.asset_tag:
            from .utils import generate_asset_tag
            self.asset_tag = generate_asset_tag()
        super().save(*args, **kwargs)

    @property
    def last_preventive_maintenance(self):
        last = self.maintenance_records.filter(maintenance_type="PREVENTIVE", status="COMPLETED").order_by("-completed_at").first()
        return last.completed_at if last else None

    @property
    def next_preventive_maintenance_due(self):
        from datetime import timedelta
        last = self.last_preventive_maintenance
        base = last or self.purchase_date
        if not base:
            return None
        from datetime import datetime, date as date_cls
        base_date = base.date() if hasattr(base, "date") else base
        return base_date + timedelta(days=self.preventive_maintenance_interval_days)

    @property
    def last_calibration(self):
        last = self.calibrations.filter(status="COMPLETED").order_by("-calibrated_at").first()
        return last.calibrated_at if last else None

    @property
    def next_calibration_due(self):
        from datetime import timedelta
        if not self.calibration_interval_days:
            return None
        last = self.last_calibration
        base = last or self.purchase_date
        if not base:
            return None
        base_date = base.date() if hasattr(base, "date") else base
        return base_date + timedelta(days=self.calibration_interval_days)

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"


class ServiceRequestPriority(models.TextChoices):
    ROUTINE = "ROUTINE", "Routine"
    URGENT = "URGENT", "Urgent"
    EMERGENCY = "EMERGENCY", "Emergency (Life-Critical Down)"


class ServiceRequestStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    ASSIGNED = "ASSIGNED", "Assigned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CANCELLED = "CANCELLED", "Cancelled"


class ServiceRequest(BaseModel):
    """A breakdown/service request — the entry point for corrective maintenance. Any staff member can raise one; a biomedical engineer picks it up."""
    request_number = models.CharField(max_length=30, unique=True, editable=False)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="service_requests")
    reported_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="service_requests_reported")
    priority = models.CharField(max_length=20, choices=ServiceRequestPriority.choices, default=ServiceRequestPriority.ROUTINE)
    problem_description = models.TextField()
    status = models.CharField(max_length=20, choices=ServiceRequestStatus.choices, default=ServiceRequestStatus.OPEN)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="service_requests_assigned")
    reported_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Downtime tracking — the equipment is unavailable from reported_at until resolved_at.
    caused_downtime = models.BooleanField(default=True, help_text="Uncheck if the equipment stayed operational despite this issue.")

    class Meta:
        db_table = "biomed_service_requests"
        ordering = ["-reported_at"]

    def save(self, *args, **kwargs):
        if not self.request_number:
            from .utils import generate_request_number
            self.request_number = generate_request_number()
        super().save(*args, **kwargs)

    @property
    def downtime_hours(self):
        if not self.caused_downtime:
            return 0
        from django.utils import timezone
        end = self.resolved_at or timezone.now()
        return round((end - self.reported_at).total_seconds() / 3600, 1)

    def __str__(self):
        return f"{self.request_number} - {self.equipment.name} ({self.status})"


class MaintenanceType(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", "Preventive"
    CORRECTIVE = "CORRECTIVE", "Corrective"


class MaintenanceRecordStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class MaintenanceRecord(BaseModel):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="maintenance_records")
    service_request = models.ForeignKey(ServiceRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="maintenance_records", help_text="Set for corrective maintenance triggered by a service request; null for scheduled preventive maintenance.")
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices, default=MaintenanceType.PREVENTIVE)
    status = models.CharField(max_length=20, choices=MaintenanceRecordStatus.choices, default=MaintenanceRecordStatus.SCHEDULED)

    scheduled_date = models.DateField(null=True, blank=True)
    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="maintenance_performed")
    work_done = models.TextField(blank=True)
    parts_used = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "biomed_maintenance_records"
        ordering = ["-scheduled_date"]

    def __str__(self):
        return f"{self.maintenance_type} - {self.equipment.name} ({self.status})"


class CalibrationStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed — Out of Tolerance"
    OVERDUE = "OVERDUE", "Overdue"


class Calibration(BaseModel):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="calibrations")
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=CalibrationStatus.choices, default=CalibrationStatus.SCHEDULED)
    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="calibrations_performed")
    calibrated_at = models.DateTimeField(null=True, blank=True)
    reference_standard = models.CharField(max_length=150, blank=True, help_text="What standard/reference device was used.")
    result_notes = models.TextField(blank=True)
    certificate_number = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "biomed_calibrations"
        ordering = ["-scheduled_date"]

    def __str__(self):
        return f"Calibration - {self.equipment.name} ({self.status})"


class SparePart(BaseModel):
    part_number = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    compatible_equipment = models.ManyToManyField(Equipment, blank=True, related_name="compatible_spare_parts")
    quantity_in_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name="biomed_spare_parts")

    class Meta:
        db_table = "biomed_spare_parts"

    @property
    def is_low_stock(self):
        return self.quantity_in_stock <= self.reorder_level

    def __str__(self):
        return f"{self.part_number} - {self.name} ({self.quantity_in_stock} in stock)"


class SparePartUsage(BaseModel):
    """One row per part consumed against a maintenance job — deducts stock."""
    maintenance_record = models.ForeignKey(MaintenanceRecord, on_delete=models.CASCADE, related_name="parts_used_records")
    spare_part = models.ForeignKey(SparePart, on_delete=models.PROTECT, related_name="usage_records")
    quantity = models.PositiveIntegerField()
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "biomed_spare_part_usage"


class ServiceContract(BaseModel):
    """External vendor maintenance/support contracts covering one or more pieces of equipment."""
    contract_number = models.CharField(max_length=50, unique=True)
    vendor_name = models.CharField(max_length=200)
    vendor_contact = models.CharField(max_length=150, blank=True)
    equipment = models.ManyToManyField(Equipment, related_name="service_contracts")
    start_date = models.DateField()
    end_date = models.DateField()
    coverage_details = models.TextField(blank=True)
    annual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "biomed_service_contracts"

    @property
    def is_expiring_soon(self):
        from datetime import date, timedelta
        return self.is_active and date.today() <= self.end_date <= date.today() + timedelta(days=30)

    def __str__(self):
        return f"{self.contract_number} - {self.vendor_name}"