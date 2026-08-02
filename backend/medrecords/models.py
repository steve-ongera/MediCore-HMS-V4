from django.db import models
from api.models import BaseModel, User, Patient


class FileStatus(models.TextChoices):
    IN_ARCHIVE = "IN_ARCHIVE", "In Archive"
    CHECKED_OUT = "CHECKED_OUT", "Checked Out"
    IN_TRANSIT = "IN_TRANSIT", "In Transit"
    ARCHIVED_OFFSITE = "ARCHIVED_OFFSITE", "Archived Offsite"
    LOST = "LOST", "Lost / Missing"


class PatientFile(BaseModel):
    """The physical/digital chart record — one per patient. Tracks location and custody, independent of clinical data."""
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="medical_file")
    file_number = models.CharField(max_length=30, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=FileStatus.choices, default=FileStatus.IN_ARCHIVE)
    current_custodian = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="patient_files_held")
    current_location = models.CharField(max_length=150, blank=True, help_text="e.g. 'Records Room Shelf B12', 'OPD Doctor's Office', 'Ward 3'")
    checked_out_at = models.DateTimeField(null=True, blank=True)
    expected_return_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="patient_files_created")

    class Meta:
        db_table = "patient_files"

    def save(self, *args, **kwargs):
        if not self.file_number:
            from .utils import generate_file_number
            self.file_number = generate_file_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.file_number} - {self.patient.full_name}"


class FileMovement(BaseModel):
    """One row per checkout/return/transfer — the file's chain-of-custody history."""
    patient_file = models.ForeignKey(PatientFile, on_delete=models.CASCADE, related_name="movements")
    action = models.CharField(max_length=20, choices=[("CHECKED_OUT", "Checked Out"), ("RETURNED", "Returned"), ("TRANSFERRED", "Transferred")])
    from_custodian = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="file_movements_from")
    to_custodian = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="file_movements_to")
    location = models.CharField(max_length=150, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="file_movements_recorded")
    moved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "file_movements"
        ordering = ["-moved_at"]


class DocumentType(models.TextChoices):
    REFERRAL_LETTER = "REFERRAL_LETTER", "Referral Letter"
    EXTERNAL_RESULT = "EXTERNAL_RESULT", "External Lab/Imaging Result"
    ID_DOCUMENT = "ID_DOCUMENT", "ID Document"
    CONSENT_FORM = "CONSENT_FORM", "Consent Form"
    INSURANCE_DOCUMENT = "INSURANCE_DOCUMENT", "Insurance Document"
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY", "Discharge Summary"
    OTHER = "OTHER", "Other"


class DocumentAttachment(BaseModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="document_attachments")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices, default=DocumentType.OTHER)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="medical_records/documents/%Y/%m/")
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="documents_uploaded")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_attachments"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.title} - {self.patient.full_name}"


class BirthRegister(BaseModel):
    """
    Statutory birth register — legal record-keeping, distinct from mch.Child
    (clinical/immunization tracking). Links back to the clinical record when
    the birth happened in-facility, but exists independently for births
    reported after the fact or where full clinical linkage isn't available.
    """
    registration_number = models.CharField(max_length=30, unique=True, editable=False)
    child_name = models.CharField(max_length=150, blank=True, help_text="May be added later if not yet named.")
    sex = models.CharField(max_length=10, choices=[("MALE", "Male"), ("FEMALE", "Female")])
    date_of_birth = models.DateField()
    time_of_birth = models.TimeField(null=True, blank=True)
    place_of_birth = models.CharField(max_length=150, default="Facility")
    mother = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="birth_register_entries")
    father_name = models.CharField(max_length=150, blank=True)
    father_national_id = models.CharField(max_length=30, blank=True)
    mch_child = models.ForeignKey("mch.Child", null=True, blank=True, on_delete=models.SET_NULL, related_name="birth_register_entry")
    attending_staff = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="births_attended")
    registered_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="births_registered")
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "birth_register"
        ordering = ["-date_of_birth"]

    def save(self, *args, **kwargs):
        if not self.registration_number:
            from .utils import generate_birth_reg_number
            self.registration_number = generate_birth_reg_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.registration_number} - {self.child_name or 'Unnamed'}"


class DeathRegister(BaseModel):
    """Statutory death register — legal record-keeping, distinct from mortuary.MortuaryAdmission (physical body handling)."""
    registration_number = models.CharField(max_length=30, unique=True, editable=False)
    deceased_name = models.CharField(max_length=150)
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="death_register_entries")
    date_of_death = models.DateTimeField()
    cause_of_death = models.TextField()
    certifying_doctor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="deaths_certified")
    mortuary_case = models.ForeignKey("mortuary.MortuaryAdmission", null=True, blank=True, on_delete=models.SET_NULL, related_name="death_register_entry")
    registered_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="deaths_registered")
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "death_register"
        ordering = ["-date_of_death"]

    def save(self, *args, **kwargs):
        if not self.registration_number:
            from .utils import generate_death_reg_number
            self.registration_number = generate_death_reg_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.registration_number} - {self.deceased_name}"


class ReferralDirection(models.TextChoices):
    INCOMING = "INCOMING", "Incoming (from another facility)"
    OUTGOING = "OUTGOING", "Outgoing (to another facility)"


class ReferralStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACCEPTED = "ACCEPTED", "Accepted"
    COMPLETED = "COMPLETED", "Completed"
    DECLINED = "DECLINED", "Declined"


class Referral(BaseModel):
    referral_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="referrals")
    direction = models.CharField(max_length=10, choices=ReferralDirection.choices)
    facility_name = models.CharField(max_length=200, help_text="The other facility — where the patient came from, or is going to.")
    facility_contact = models.CharField(max_length=100, blank=True)
    reason = models.TextField()
    clinical_summary = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ReferralStatus.choices, default=ReferralStatus.PENDING)
    referring_doctor = models.CharField(max_length=150, blank=True, help_text="Free text for outside doctors on incoming referrals.")
    receiving_doctor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals_received")
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="referrals_created")
    created_at_display = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "referrals"
        ordering = ["-created_at_display"]

    def save(self, *args, **kwargs):
        if not self.referral_number:
            from .utils import generate_referral_number
            self.referral_number = generate_referral_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.referral_number} - {self.direction} - {self.patient.full_name}"


class DischargeSummary(BaseModel):
    """
    Formal discharge documentation. Links to an inpatient Admission (the
    clinical stay already exists there) — this is the structured summary
    document HIM ensures is complete before the patient's file is archived.
    """
    admission = models.OneToOneField("inpatient.Admission", on_delete=models.CASCADE, related_name="discharge_summary_doc")
    diagnosis_on_admission = models.TextField(blank=True)
    diagnosis_on_discharge = models.TextField(blank=True)
    procedures_performed = models.TextField(blank=True)
    treatment_summary = models.TextField(blank=True)
    condition_on_discharge = models.CharField(max_length=100, blank=True)
    discharge_medications = models.TextField(blank=True)
    followup_instructions = models.TextField(blank=True)
    is_complete = models.BooleanField(default=False)
    completed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="discharge_summaries_completed")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="discharge_summaries_created")

    class Meta:
        db_table = "discharge_summaries"

    def __str__(self):
        return f"Discharge Summary - {self.admission.admission_number}"


class RecordRequestStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    DENIED = "DENIED", "Denied"
    FULFILLED = "FULFILLED", "Fulfilled"


class RecordRequestPurpose(models.TextChoices):
    CLINICAL_CARE = "CLINICAL_CARE", "Continued Clinical Care"
    INSURANCE = "INSURANCE", "Insurance Claim"
    LEGAL = "LEGAL", "Legal Proceedings"
    PATIENT_COPY = "PATIENT_COPY", "Patient's Own Copy"
    RESEARCH = "RESEARCH", "Research"
    OTHER = "OTHER", "Other"


class RecordRequest(BaseModel):
    """Controlled access — anyone wanting a patient's records must file a request, which HIM approves/denies/tracks. This is the access-control layer."""
    request_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="record_requests")
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="record_requests_made")
    purpose = models.CharField(max_length=20, choices=RecordRequestPurpose.choices)
    purpose_details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=RecordRequestStatus.choices, default=RecordRequestStatus.PENDING)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="record_requests_reviewed")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    denial_reason = models.TextField(blank=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "record_requests"
        ordering = ["-requested_at"]

    def save(self, *args, **kwargs):
        if not self.request_number:
            from .utils import generate_request_number
            self.request_number = generate_request_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_number} - {self.patient.full_name} ({self.status})"


class RecordAuditAction(models.TextChoices):
    VIEWED = "VIEWED", "Viewed"
    EXPORTED = "EXPORTED", "Exported"
    PRINTED = "PRINTED", "Printed"
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED", "Document Uploaded"
    FILE_CHECKED_OUT = "FILE_CHECKED_OUT", "File Checked Out"
    FILE_RETURNED = "FILE_RETURNED", "File Returned"


class RecordAuditTrail(BaseModel):
    """Immutable — no update/delete path exposed anywhere. Every access to a patient's medical record is logged here, same discipline as SecurityAuditLog."""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="record_audit_entries")
    action = models.CharField(max_length=30, choices=RecordAuditAction.choices)
    performed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="record_audit_actions")
    detail = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "record_audit_trail"
        ordering = ["-occurred_at"]
        indexes = [models.Index(fields=["patient", "occurred_at"])]

    def __str__(self):
        return f"{self.action} - {self.patient.full_name} by {self.performed_by.username}"