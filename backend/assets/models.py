import uuid
from datetime import date
from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Department, Supplier


class AssetCategory(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    default_useful_life_years = models.PositiveSmallIntegerField(
        default=5, help_text="Used for straight-line depreciation if the asset doesn't override it."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "asset_categories"
        verbose_name_plural = "Asset Categories"

    def __str__(self):
        return self.name


class AssetCondition(models.TextChoices):
    EXCELLENT = "EXCELLENT", "Excellent"
    GOOD = "GOOD", "Good"
    FAIR = "FAIR", "Fair"
    POOR = "POOR", "Poor"
    NON_FUNCTIONAL = "NON_FUNCTIONAL", "Non-Functional"


class AssetStatus(models.TextChoices):
    IN_USE = "IN_USE", "In Use"
    IN_STORE = "IN_STORE", "In Store / Unassigned"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE", "Under Maintenance"
    DISPOSED = "DISPOSED", "Disposed"
    LOST = "LOST", "Lost / Missing"


class Asset(BaseModel):
    asset_tag = models.CharField(max_length=30, unique=True, editable=False)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name="assets")
    description = models.TextField(blank=True)

    serial_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=150, blank=True)
    model_number = models.CharField(max_length=100, blank=True)

    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets_supplied")
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    useful_life_years = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Overrides the category default if set."
    )
    salvage_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    warranty_expiry = models.DateField(null=True, blank=True)

    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets")
    location_notes = models.CharField(max_length=255, blank=True, help_text="Free-text location detail, e.g. 'Ward 3, Room 4'.")
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets_assigned")

    status = models.CharField(max_length=20, choices=AssetStatus.choices, default=AssetStatus.IN_STORE)
    condition = models.CharField(max_length=20, choices=AssetCondition.choices, default=AssetCondition.GOOD)

    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="assets_registered")

    class Meta:
        db_table = "assets"

    def save(self, *args, **kwargs):
        if not self.asset_tag:
            from .utils import generate_asset_tag
            self.asset_tag = generate_asset_tag()
        super().save(*args, **kwargs)

    @property
    def effective_useful_life_years(self):
        return self.useful_life_years or self.category.default_useful_life_years

    @property
    def current_value(self):
        """Straight-line depreciation, floored at salvage_value.

        Everything here is kept in Decimal on purpose: purchase_cost and
        salvage_value are DecimalFields, and Decimal * float raises
        TypeError. Building years_elapsed as a Decimal (instead of dividing
        .days, an int, by 365.25, a float) avoids that.
        """
        if not self.purchase_date or self.effective_useful_life_years <= 0:
            return self.purchase_cost

        days_elapsed = (date.today() - self.purchase_date).days
        years_elapsed = Decimal(days_elapsed) / Decimal("365.25")
        depreciable_amount = self.purchase_cost - self.salvage_value
        annual_depreciation = depreciable_amount / self.effective_useful_life_years
        accumulated = min(annual_depreciation * years_elapsed, depreciable_amount)
        value = self.purchase_cost - accumulated
        return max(value, self.salvage_value)

    @property
    def is_under_warranty(self):
        return bool(self.warranty_expiry and self.warranty_expiry >= date.today())

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"


class MaintenanceType(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", "Preventive"
    CORRECTIVE = "CORRECTIVE", "Corrective / Repair"
    CALIBRATION = "CALIBRATION", "Calibration"
    INSPECTION = "INSPECTION", "Inspection"


class MaintenanceStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class AssetMaintenance(BaseModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="maintenance_records")
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices, default=MaintenanceType.PREVENTIVE)
    status = models.CharField(max_length=20, choices=MaintenanceStatus.choices, default=MaintenanceStatus.SCHEDULED)

    scheduled_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    vendor = models.CharField(max_length=150, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    logged_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="asset_maintenance_logged")

    class Meta:
        db_table = "asset_maintenance"
        ordering = ["-scheduled_date"]

    def __str__(self):
        return f"{self.asset.asset_tag} - {self.maintenance_type} ({self.status})"


class AssetTransfer(BaseModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="transfers")
    from_department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="asset_transfers_from")
    to_department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="asset_transfers_to")
    from_custodian = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="asset_transfers_from_custodian")
    to_custodian = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="asset_transfers_to_custodian")
    reason = models.CharField(max_length=255, blank=True)
    transferred_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="asset_transfers_made")
    transferred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "asset_transfers"
        ordering = ["-transferred_at"]


class DisposalMethod(models.TextChoices):
    SOLD = "SOLD", "Sold"
    SCRAPPED = "SCRAPPED", "Scrapped"
    DONATED = "DONATED", "Donated"
    LOST = "LOST", "Lost"
    STOLEN = "STOLEN", "Stolen"
    TRADE_IN = "TRADE_IN", "Traded In"


class AssetDisposal(BaseModel):
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE, related_name="disposal")
    disposal_date = models.DateField()
    disposal_method = models.CharField(max_length=20, choices=DisposalMethod.choices)
    disposal_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="asset_disposals_approved")
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="asset_disposals_recorded")

    class Meta:
        db_table = "asset_disposals"

    def __str__(self):
        return f"{self.asset.asset_tag} - {self.disposal_method}"