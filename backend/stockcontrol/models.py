from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Medicine, MedicineBatch


class LocationType(models.TextChoices):
    MAIN_PHARMACY = "MAIN_PHARMACY", "Main Pharmacy"
    WARD = "WARD", "Ward / Department Sub-Store"
    AMBULANCE = "AMBULANCE", "Ambulance"
    THEATRE = "THEATRE", "Theatre"
    EMERGENCY = "EMERGENCY", "Emergency Department"
    OTHER = "OTHER", "Other"


class StoreLocation(BaseModel):
    """Every physical point stock can sit — Main Pharmacy is the root; everything else only ever receives stock via a tracked transfer from somewhere else."""
    name = models.CharField(max_length=150, unique=True)
    location_type = models.CharField(max_length=20, choices=LocationType.choices, default=LocationType.WARD)
    custodian = models.ForeignKey(User, on_delete=models.PROTECT, related_name="custodied_locations", help_text="Person accountable for stock at this location.")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "store_locations"

    def __str__(self):
        return f"{self.name} ({self.location_type})"


class StoreStock(BaseModel):
    """Ledger balance — how much of a medicine is currently at a location. Never edited directly; only ever changed by transfers, counts, or (for Main Pharmacy) goods receipts."""
    location = models.ForeignKey(StoreLocation, on_delete=models.CASCADE, related_name="stock")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="location_stock")
    quantity_on_hand = models.IntegerField(default=0)

    class Meta:
        db_table = "store_stock"
        unique_together = ("location", "medicine")

    def __str__(self):
        return f"{self.location.name} - {self.medicine.name}: {self.quantity_on_hand}"


class TransferStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    APPROVED = "APPROVED", "Approved"
    DISPATCHED = "DISPATCHED", "Dispatched"
    RECEIVED = "RECEIVED", "Received — Matched"
    DISCREPANCY = "DISCREPANCY", "Received — Discrepancy Flagged"
    CANCELLED = "CANCELLED", "Cancelled"


class StockTransferRequest(BaseModel):
    """
    Moves stock between two locations. Requires the FULL chain:
    request -> approve -> dispatch (sender confirms what left) -> receive
    (receiver independently confirms what arrived). Any mismatch between
    dispatched and received quantities is a DISCREPANCY, flagged automatically.
    """
    transfer_number = models.CharField(max_length=30, unique=True, editable=False)
    from_location = models.ForeignKey(StoreLocation, on_delete=models.PROTECT, related_name="transfers_out")
    to_location = models.ForeignKey(StoreLocation, on_delete=models.PROTECT, related_name="transfers_in")
    status = models.CharField(max_length=20, choices=TransferStatus.choices, default=TransferStatus.REQUESTED)

    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="stock_transfers_requested")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_transfers_approved")
    dispatched_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_transfers_dispatched")
    received_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_transfers_received")

    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        db_table = "stock_transfer_requests"
        ordering = ["-requested_at"]

    def save(self, *args, **kwargs):
        if not self.transfer_number:
            from .utils import generate_transfer_number
            self.transfer_number = generate_transfer_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transfer_number}: {self.from_location.name} → {self.to_location.name}"


class StockTransferItem(BaseModel):
    transfer = models.ForeignKey(StockTransferRequest, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="transfer_items")
    quantity_requested = models.PositiveIntegerField()
    quantity_dispatched = models.PositiveIntegerField(null=True, blank=True)
    quantity_received = models.PositiveIntegerField(null=True, blank=True)
    batch = models.ForeignKey(MedicineBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name="transfer_items")

    class Meta:
        db_table = "stock_transfer_items"

    @property
    def has_discrepancy(self):
        if self.quantity_dispatched is None or self.quantity_received is None:
            return False
        return self.quantity_dispatched != self.quantity_received

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity_requested}"


class StockCountStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved — Adjusted"
    VARIANCE_PENDING = "VARIANCE_PENDING", "Variance Pending Approval"


class StockCount(BaseModel):
    """Periodic physical count at one location — every item counted is compared against the system's StoreStock ledger."""
    count_number = models.CharField(max_length=30, unique=True, editable=False)
    location = models.ForeignKey(StoreLocation, on_delete=models.CASCADE, related_name="stock_counts")
    counted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="stock_counts_performed")
    status = models.CharField(max_length=20, choices=StockCountStatus.choices, default=StockCountStatus.IN_PROGRESS)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_counts_approved")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "stock_counts"
        ordering = ["-started_at"]

    def save(self, *args, **kwargs):
        if not self.count_number:
            from .utils import generate_count_number
            self.count_number = generate_count_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.count_number} - {self.location.name}"


class StockCountLine(BaseModel):
    stock_count = models.ForeignKey(StockCount, on_delete=models.CASCADE, related_name="lines")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="count_lines")
    system_quantity = models.IntegerField()  # snapshot at time of count
    counted_quantity = models.IntegerField()
    variance = models.IntegerField(editable=False)
    explanation = models.TextField(blank=True)

    class Meta:
        db_table = "stock_count_lines"

    def save(self, *args, **kwargs):
        self.variance = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.name}: system {self.system_quantity} / counted {self.counted_quantity}"