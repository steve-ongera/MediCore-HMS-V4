import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Patient, Role

from medrecords.models import (
    PatientFile,
    FileStatus,
    FileMovement,
    DocumentAttachment,
    DocumentType,
    BirthRegister,
    DeathRegister,
    Referral,
    ReferralDirection,
    ReferralStatus,
    RecordRequest,
    RecordRequestPurpose,
    RecordRequestStatus,
    RecordAuditTrail,
    RecordAuditAction,
)

User = get_user_model()

# ---------------------------------------------------------------------------
# Small local fixtures — kept dependency-free (no Faker) on purpose.
# ---------------------------------------------------------------------------
LOCATIONS = [
    "Records Room Shelf A1", "Records Room Shelf B12", "Records Room Shelf C4",
    "OPD Doctor's Office", "Ward 1", "Ward 2", "Ward 3", "Maternity Wing",
    "Records Room Archive Bay 2", "Records Room Archive Bay 5",
]

CHECKOUT_REASONS = [
    "Follow-up consultation", "Ward round reference", "Insurance audit",
    "Clinical review", "Referral preparation", "Discharge summary completion",
]

REFERRAL_FACILITIES = [
    "Coast General Teaching & Referral Hospital", "Aga Khan Hospital Mombasa",
    "Port Reitz Sub-County Hospital", "Mombasa Hospital", "Pandya Memorial Hospital",
    "Kenyatta National Hospital",
]

REFERRAL_REASONS = [
    "Specialist evaluation required", "Advanced imaging not available on site",
    "Higher-level surgical intervention needed", "ICU capacity required",
    "Continuity of chronic disease management",
]

DOCUMENT_TITLES = {
    DocumentType.REFERRAL_LETTER: "Referral Letter",
    DocumentType.EXTERNAL_RESULT: "External Lab/Imaging Result",
    DocumentType.ID_DOCUMENT: "Copy of National ID",
    DocumentType.CONSENT_FORM: "Signed Consent Form",
    DocumentType.INSURANCE_DOCUMENT: "Insurance Cover Letter",
    DocumentType.DISCHARGE_SUMMARY: "Discharge Summary Scan",
    DocumentType.OTHER: "Miscellaneous Document",
}

FATHER_NAMES = [
    "James Mwangi", "Peter Kamau", "Ali Hassan", "John Otieno", "David Kiptoo",
    "Samuel Mutua", "Francis Njoroge", "Hassan Juma",
]

CAUSES_OF_DEATH = [
    "Cardiac arrest secondary to acute myocardial infarction",
    "Complications of severe malaria",
    "Multi-organ failure following sepsis",
    "Respiratory failure due to advanced pneumonia",
    "Massive haemorrhage following road traffic accident",
]

DENIAL_REASONS = [
    "Insufficient consent documentation provided",
    "Requesting party could not be verified",
    "Purpose of request not adequately justified",
]


class Command(BaseCommand):
    help = (
        "Seed the medrecords app with demo data, reusing existing api.Patient "
        "and api.User rows. The only new users created are the two records-"
        "office staff accounts (Health Records Officer, Medical Records Officer)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing medrecords rows before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self.flush_existing()

        self.hro_user, self.mro_user = self.create_records_staff()

        self.patients = list(Patient.objects.all())
        if not self.patients:
            self.stderr.write(self.style.ERROR(
                "No Patient records found — seed the api app first."
            ))
            return

        self.staff_pool = list(User.objects.filter(is_active_staff=True)) or [self.hro_user, self.mro_user]
        self.doctors = list(User.objects.filter(role=Role.DOCTOR)) or self.staff_pool
        self.records_staff = [self.hro_user, self.mro_user]

        patient_files = self.seed_patient_files()
        self.seed_document_attachments()
        self.seed_birth_register()
        self.seed_death_register()
        self.seed_referrals()
        self.seed_record_requests()
        self.seed_record_audit_trail(patient_files)

        self.stdout.write(self.style.SUCCESS("medrecords seed data created successfully."))

    # ------------------------------------------------------------------
    def flush_existing(self):
        self.stdout.write("Flushing existing medrecords data...")
        RecordAuditTrail.objects.all().delete()
        RecordRequest.objects.all().delete()
        Referral.objects.all().delete()
        DeathRegister.objects.all().delete()
        BirthRegister.objects.all().delete()
        DocumentAttachment.objects.all().delete()
        FileMovement.objects.all().delete()
        PatientFile.objects.all().delete()

    # ------------------------------------------------------------------
    def create_records_staff(self):
        """
        Only two new users are created here — the two records-office roles.
        Everyone else (doctors, nurses, cashiers, etc.) is assumed to
        already exist from the api app's own seeding.
        """
        hro, created = User.objects.get_or_create(
            username="hro.records",
            defaults=dict(
                first_name="Grace",
                last_name="Wanjiru",
                email="hro.records@hospital.local",
                role=Role.HEALTH_RECORDS_OFFICER,
                phone="0712000001",
                is_active_staff=True,
            ),
        )
        if created:
            hro.set_password("ChangeMe123!")
            hro.save()
            self.stdout.write(f"Created user: {hro.username} ({hro.role})")

        mro, created = User.objects.get_or_create(
            username="mro.records",
            defaults=dict(
                first_name="Brian",
                last_name="Otieno",
                email="mro.records@hospital.local",
                role=Role.MEDICAL_RECORDS_OFFICER,
                phone="0712000002",
                is_active_staff=True,
            ),
        )
        if created:
            mro.set_password("ChangeMe123!")
            mro.save()
            self.stdout.write(f"Created user: {mro.username} ({mro.role})")

        return hro, mro

    # ------------------------------------------------------------------
    def seed_patient_files(self):
        self.stdout.write("Seeding PatientFile + FileMovement...")
        files = []
        statuses = list(FileStatus.choices)

        for patient in self.patients:
            patient_file, created = PatientFile.objects.get_or_create(
                patient=patient,
                defaults=dict(
                    status=FileStatus.IN_ARCHIVE,
                    current_location=random.choice(LOCATIONS),
                    created_by=random.choice(self.records_staff),
                ),
            )
            if not created:
                files.append(patient_file)
                continue

            # Give roughly half the files some checkout/return history.
            if random.random() < 0.5:
                custodian = random.choice(self.doctors)
                out_time = timezone.now() - timedelta(days=random.randint(1, 60))

                FileMovement.objects.create(
                    patient_file=patient_file,
                    action="CHECKED_OUT",
                    from_custodian=None,
                    to_custodian=custodian,
                    location=random.choice(LOCATIONS),
                    reason=random.choice(CHECKOUT_REASONS),
                    recorded_by=random.choice(self.records_staff),
                )

                if random.random() < 0.7:
                    # Returned — file goes back to archive.
                    FileMovement.objects.create(
                        patient_file=patient_file,
                        action="RETURNED",
                        from_custodian=custodian,
                        to_custodian=None,
                        location="Records Room",
                        reason="Consultation complete",
                        recorded_by=random.choice(self.records_staff),
                    )
                    patient_file.status = FileStatus.IN_ARCHIVE
                    patient_file.current_custodian = None
                    patient_file.checked_out_at = None
                    patient_file.expected_return_at = None
                else:
                    # Still checked out.
                    patient_file.status = FileStatus.CHECKED_OUT
                    patient_file.current_custodian = custodian
                    patient_file.current_location = "OPD Doctor's Office"
                    patient_file.checked_out_at = out_time
                    patient_file.expected_return_at = out_time + timedelta(days=random.randint(1, 5))
                patient_file.save()
            else:
                # Occasionally mark a file lost or archived offsite for variety.
                if random.random() < 0.05:
                    patient_file.status = FileStatus.LOST
                    patient_file.current_location = ""
                    patient_file.save()
                elif random.random() < 0.1:
                    patient_file.status = FileStatus.ARCHIVED_OFFSITE
                    patient_file.current_location = "Offsite Storage Facility"
                    patient_file.save()

            files.append(patient_file)

        self.stdout.write(f"  -> {len(files)} patient files ready.")
        return files

    # ------------------------------------------------------------------
    def seed_document_attachments(self):
        self.stdout.write("Seeding DocumentAttachment...")
        count = 0
        doc_types = [c[0] for c in DocumentType.choices]

        for patient in random.sample(self.patients, k=max(1, len(self.patients) // 2)):
            for _ in range(random.randint(1, 3)):
                doc_type = random.choice(doc_types)
                DocumentAttachment.objects.create(
                    patient=patient,
                    document_type=doc_type,
                    title=f"{DOCUMENT_TITLES[doc_type]} - {patient.full_name}",
                    file="medical_records/documents/placeholder.pdf",
                    description="Seeded demo document.",
                    uploaded_by=random.choice(self.records_staff + self.doctors),
                )
                count += 1

        self.stdout.write(f"  -> {count} document attachments created.")

    # ------------------------------------------------------------------
    def seed_birth_register(self):
        self.stdout.write("Seeding BirthRegister...")
        mothers = [p for p in self.patients if p.gender == "FEMALE"]
        if not mothers:
            self.stdout.write("  -> no female patients found, skipping.")
            return

        count = 0
        for mother in random.sample(mothers, k=min(len(mothers), max(1, len(mothers) // 3))):
            dob = timezone.now().date() - timedelta(days=random.randint(1, 700))
            BirthRegister.objects.create(
                child_name=random.choice(["", "Baby " + mother.full_name.split()[0]]),
                sex=random.choice(["MALE", "FEMALE"]),
                date_of_birth=dob,
                place_of_birth="Facility",
                mother=mother,
                father_name=random.choice(FATHER_NAMES + [""]),
                attending_staff=random.choice(self.doctors),
                registered_by=random.choice(self.records_staff),
            )
            count += 1

        self.stdout.write(f"  -> {count} birth register entries created.")

    # ------------------------------------------------------------------
    def seed_death_register(self):
        self.stdout.write("Seeding DeathRegister...")
        count = 0
        sample_size = max(1, len(self.patients) // 10)
        for patient in random.sample(self.patients, k=min(sample_size, len(self.patients))):
            date_of_death = timezone.now() - timedelta(days=random.randint(1, 365))
            DeathRegister.objects.create(
                deceased_name=patient.full_name,
                patient=patient,
                date_of_death=date_of_death,
                cause_of_death=random.choice(CAUSES_OF_DEATH),
                certifying_doctor=random.choice(self.doctors),
                registered_by=random.choice(self.records_staff),
            )
            count += 1

        self.stdout.write(f"  -> {count} death register entries created.")

    # ------------------------------------------------------------------
    def seed_referrals(self):
        self.stdout.write("Seeding Referral...")
        count = 0
        for patient in random.sample(self.patients, k=max(1, len(self.patients) // 3)):
            direction = random.choice(list(ReferralDirection.choices))[0]
            status = random.choice(list(ReferralStatus.choices))[0]
            resolved_at = None
            if status in (ReferralStatus.COMPLETED, ReferralStatus.DECLINED):
                resolved_at = timezone.now() - timedelta(days=random.randint(0, 30))

            Referral.objects.create(
                patient=patient,
                direction=direction,
                facility_name=random.choice(REFERRAL_FACILITIES),
                facility_contact="0700-000-000",
                reason=random.choice(REFERRAL_REASONS),
                clinical_summary="Seeded demo clinical summary for referral.",
                status=status,
                referring_doctor="Dr. External Referrer" if direction == "INCOMING" else "",
                receiving_doctor=random.choice(self.doctors) if direction == "OUTGOING" else None,
                created_by=random.choice(self.records_staff + self.doctors),
                resolved_at=resolved_at,
            )
            count += 1

        self.stdout.write(f"  -> {count} referrals created.")

    # ------------------------------------------------------------------
    def seed_record_requests(self):
        self.stdout.write("Seeding RecordRequest...")
        count = 0
        purposes = [c[0] for c in RecordRequestPurpose.choices]

        for patient in random.sample(self.patients, k=max(1, len(self.patients) // 3)):
            status = random.choice(list(RecordRequestStatus.choices))[0]
            reviewed_by = None
            reviewed_at = None
            denial_reason = ""
            fulfilled_at = None

            if status != RecordRequestStatus.PENDING:
                reviewed_by = random.choice(self.records_staff)
                reviewed_at = timezone.now() - timedelta(days=random.randint(0, 20))
            if status == RecordRequestStatus.DENIED:
                denial_reason = random.choice(DENIAL_REASONS)
            if status == RecordRequestStatus.FULFILLED:
                fulfilled_at = reviewed_at + timedelta(days=random.randint(0, 3))

            RecordRequest.objects.create(
                patient=patient,
                requested_by=random.choice(self.staff_pool),
                purpose=random.choice(purposes),
                purpose_details="Seeded demo record request.",
                status=status,
                reviewed_by=reviewed_by,
                reviewed_at=reviewed_at,
                denial_reason=denial_reason,
                fulfilled_at=fulfilled_at,
            )
            count += 1

        self.stdout.write(f"  -> {count} record requests created.")

    # ------------------------------------------------------------------
    def seed_record_audit_trail(self, patient_files):
        self.stdout.write("Seeding RecordAuditTrail...")
        count = 0
        actions = [c[0] for c in RecordAuditAction.choices]

        for patient in self.patients:
            for _ in range(random.randint(1, 4)):
                RecordAuditTrail.objects.create(
                    patient=patient,
                    action=random.choice(actions),
                    performed_by=random.choice(self.staff_pool),
                    detail="Seeded demo audit entry.",
                    ip_address=f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
                )
                count += 1

        self.stdout.write(f"  -> {count} audit trail entries created.")