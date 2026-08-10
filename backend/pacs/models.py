from django.db import models
from api.models import BaseModel, User, Patient


class Modality(models.TextChoices):
    """Standard DICOM modality codes — matches real equipment types."""
    CR = "CR", "Computed Radiography (X-Ray)"
    CT = "CT", "Computed Tomography"
    MR = "MR", "Magnetic Resonance"
    US = "US", "Ultrasound"
    MG = "MG", "Mammography"
    DX = "DX", "Digital Radiography"
    OT = "OT", "Other"


class StudyStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Images Received"
    REPORTED = "REPORTED", "Reported"
    CANCELLED = "CANCELLED", "Cancelled"


class Study(BaseModel):
    """
    A DICOM Study — corresponds one-to-one with a real radiology exam. In
    production this row is created either when the exam is scheduled (RIS
    side) or when the modality pushes the first image and the PACS server
    reports a new StudyInstanceUID we haven't seen. study_instance_uid is
    the real DICOM identifier format (a dotted numeric OID) even in demo
    mode, so nothing about the data shape needs to change when real
    equipment is connected.
    """
    study_instance_uid = models.CharField(max_length=128, unique=True, editable=False)
    accession_number = models.CharField(max_length=30, unique=True, editable=False, help_text="RIS-side order reference, matches DICOM AccessionNumber.")

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="pacs_studies")
    radiology_order = models.ForeignKey(
        "api.RadiologyOrder", null=True, blank=True, on_delete=models.SET_NULL, related_name="pacs_study",
        help_text="Links back to the existing RIS order in the radiology app, if this study originated from one."
    )

    modality = models.CharField(max_length=10, choices=Modality.choices, default=Modality.OT)
    description = models.CharField(max_length=255, blank=True, help_text="Study description, e.g. 'Chest X-Ray PA', 'CT Abdomen with Contrast'.")
    status = models.CharField(max_length=20, choices=StudyStatus.choices, default=StudyStatus.SCHEDULED)

    referring_physician = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="pacs_studies_referred")
    performing_technologist = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="pacs_studies_performed")

    study_date = models.DateTimeField(null=True, blank=True, help_text="When the exam was actually performed — set when images are received.")
    scheduled_at = models.DateTimeField(auto_now_add=True)

    source = models.CharField(
        max_length=20, choices=[("DEMO", "Demo / Simulated"), ("REAL_MODALITY", "Real Modality (DICOM)")],
        default="DEMO",
        help_text="Marks whether this study's images came from the mock gateway or a real connected modality — kept visible in the UI so nobody mistakes demo data for a real patient study once real equipment is connected.",
    )

    class Meta:
        db_table = "pacs_studies"
        ordering = ["-scheduled_at"]

    def save(self, *args, **kwargs):
        if not self.study_instance_uid:
            from .utils import generate_study_instance_uid
            self.study_instance_uid = generate_study_instance_uid()
        if not self.accession_number:
            from .utils import generate_accession_number
            self.accession_number = generate_accession_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.accession_number} - {self.patient.full_name} ({self.modality})"


class Series(BaseModel):
    """A DICOM Series within a Study — e.g. one CT study has multiple series (axial, coronal, with/without contrast)."""
    series_instance_uid = models.CharField(max_length=128, unique=True, editable=False)
    study = models.ForeignKey(Study, on_delete=models.CASCADE, related_name="series_set")
    series_number = models.PositiveIntegerField(default=1)
    series_description = models.CharField(max_length=255, blank=True)
    modality = models.CharField(max_length=10, choices=Modality.choices, default=Modality.OT)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pacs_series"
        ordering = ["series_number"]

    def save(self, *args, **kwargs):
        if not self.series_instance_uid:
            from .utils import generate_series_instance_uid
            self.series_instance_uid = generate_series_instance_uid()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Series {self.series_number} - {self.study.accession_number}"


class DicomImage(BaseModel):
    """
    One DICOM instance (a single image/slice) within a Series. In demo
    mode, `file` holds a placeholder/sample image and `is_simulated=True`.
    In production with a real PACS server (e.g. Orthanc), this row instead
    stores the SOP Instance UID and a reference URL/path the gateway
    resolves against the real PACS store — the model shape doesn't change,
    only how `file`/`external_reference` gets populated.
    """
    sop_instance_uid = models.CharField(max_length=128, unique=True, editable=False)
    series = models.ForeignKey(Series, on_delete=models.CASCADE, related_name="images")
    instance_number = models.PositiveIntegerField(default=1)

    file = models.ImageField(upload_to="pacs/images/%Y/%m/", null=True, blank=True, help_text="Demo mode: a real preview image file. Production: may be left blank in favor of external_reference if images are served directly by the PACS server.")
    external_reference = models.CharField(max_length=500, blank=True, help_text="Production: WADO-URI or PACS-native retrieval URL for this instance, when images are served by an external DICOM server rather than stored in Django media.")

    is_simulated = models.BooleanField(default=True, help_text="True for demo/mock images. False once real modality integration is connected.")
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pacs_images"
        ordering = ["instance_number"]

    def save(self, *args, **kwargs):
        if not self.sop_instance_uid:
            from .utils import generate_sop_instance_uid
            self.sop_instance_uid = generate_sop_instance_uid()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Instance {self.instance_number} - {self.series}"


class ReportStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    FINAL = "FINAL", "Final"
    ADDENDUM = "ADDENDUM", "Addendum"


class RadiologyReport(BaseModel):
    """
    The radiologist's report against a Study. This is deliberately
    PACS-side (not duplicating radiology.RadiologyResult) — it's the report
    tied to the actual images, which is where a real RIS/PACS keeps it;
    the existing radiology app's result record can reference this by
    linking through radiology_order -> pacs_study -> report.
    """
    study = models.OneToOneField(Study, on_delete=models.CASCADE, related_name="report")
    radiologist = models.ForeignKey(User, on_delete=models.PROTECT, related_name="pacs_reports_authored")
    findings = models.TextField(blank=True)
    impression = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ReportStatus.choices, default=ReportStatus.DRAFT)
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pacs_reports"

    def __str__(self):
        return f"Report - {self.study.accession_number} ({self.status})"