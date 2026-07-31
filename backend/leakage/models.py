from django.db import models
from api.models import BaseModel, User, Invoice


class LeakageSourceType(models.TextChoices):
    LAB = "LAB", "Laboratory"
    RADIOLOGY = "RADIOLOGY", "Radiology"
    PHARMACY_DISPENSE = "PHARMACY_DISPENSE", "Pharmacy Dispense"
    CONSULTATION_PROCEDURE = "CONSULTATION_PROCEDURE", "Consultation Procedure"
    THEATRE = "THEATRE", "Theatre / Surgery"
    DENTAL = "DENTAL", "Dental Procedure"
    EYE_CLINIC = "EYE_CLINIC", "Eye Clinic Procedure"
    MCH_DELIVERY = "MCH_DELIVERY", "MCH Delivery"
    MCH_IMMUNIZATION = "MCH_IMMUNIZATION", "MCH Immunization"
    DIALYSIS = "DIALYSIS", "Dialysis Session"
    ICU_PROCEDURE = "ICU_PROCEDURE", "ICU Procedure"
    ICU_BED = "ICU_BED", "ICU Bed Charge"
    INPATIENT_BED = "INPATIENT_BED", "Inpatient Bed Charge"
    BLOOD_BANK = "BLOOD_BANK", "Blood Unit Issue"
    AMBULANCE = "AMBULANCE", "Ambulance Dispatch"
    MORTUARY = "MORTUARY", "Mortuary Service"


class LeakageStatus(models.TextChoices):
    OPEN = "OPEN", "Unbilled — Open"
    RESOLVED = "RESOLVED", "Resolved — Invoice Created"
    WRITTEN_OFF = "WRITTEN_OFF", "Written Off (Justified)"


class RevenueLeakageRecord(BaseModel):
    """
    One row per detected billing gap: a clinical event exists (lab result,
    dispensed medicine, procedure performed, etc.) with no matching Invoice.
    Populated by the reconciliation scan (services.run_leakage_scan), never
    written to directly by any clinical workflow — this is purely a
    detection/reporting layer sitting on top of existing data.
    """
    source_type = models.CharField(max_length=30, choices=LeakageSourceType.choices)
    source_object_id = models.UUIDField(help_text="PK of the underlying record (LabOrder, PharmacyDispense, etc.)")
    patient_name = models.CharField(max_length=150)
    hospital_number = models.CharField(max_length=50, blank=True)
    description = models.CharField(max_length=255)
    expected_amount = models.DecimalField(max_digits=12, decimal_places=2)
    event_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=LeakageStatus.choices, default=LeakageStatus.OPEN)

    resolved_invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="resolved_leakage_records")
    resolved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="leakage_records_resolved")
    resolved_at = models.DateTimeField(null=True, blank=True)
    write_off_reason = models.TextField(blank=True)

    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "revenue_leakage_records"
        unique_together = ("source_type", "source_object_id")
        ordering = ["-event_date"]
        indexes = [
            models.Index(fields=["status", "source_type"]),
            models.Index(fields=["event_date"]),
        ]

    def __str__(self):
        return f"{self.source_type} - {self.description} (KES {self.expected_amount}) - {self.status}"


class LeakageScanLog(BaseModel):
    """Audit trail of every reconciliation scan run — who/what triggered it, what it found."""
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    triggered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="leakage_scans_triggered")
    new_leaks_found = models.PositiveIntegerField(default=0)
    total_open_leaks = models.PositiveIntegerField(default=0)
    total_leaked_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "leakage_scan_logs"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Scan @ {self.started_at} - {self.new_leaks_found} new leaks"