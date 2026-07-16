"""
Place this file at:  insurance/management/commands/seed_insurance.py

(Django requires empty __init__.py files in insurance/management/ and
insurance/management/commands/ if they don't already exist.)

Usage:
    python manage.py seed_insurance
    python manage.py seed_insurance --patients 50
    python manage.py seed_insurance --flush        # delete previously seeded data first

This command creates its own Patients / Visits / Invoices (tagged so they can
be found and wiped again with --flush) and then builds a realistic insurance
layer on top of them: Insurers, PatientInsurancePolicy, EligibilityCheck,
InsuranceClaim and ClaimItem.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    User,
    Role,
    Department,
    Patient,
    Gender,
    Visit,
    ConsultationType,
    VisitStatus,
    Invoice,
    InvoiceSourceType,
    InvoiceStatus,
)
from insurance.models import (
    Insurer,
    InsurerType,
    PatientInsurancePolicy,
    EligibilityCheck,
    InsuranceClaim,
    ClaimStatus,
    ClaimItem,
)

# Anything this command creates is tagged with this marker so --flush can
# find it again without touching real hospital data.
SEED_TAG = "SEED-INS"

FIRST_NAMES = [
    "Wanjiru", "Njoroge", "Achieng", "Otieno", "Kamau", "Mutua", "Wambui",
    "Kiprotich", "Chebet", "Njeri", "Mwangi", "Auma", "Odhiambo", "Wafula",
    "Nekesa", "Kilonzo", "Muthoni", "Kariuki", "Adhiambo", "Barasa",
    "Cheruiyot", "Nyambura", "Omondi", "Waweru", "Akinyi", "Kimani",
    "Chepkoech", "Mumbi", "Onyango", "Wekesa",
]
LAST_NAMES = [
    "Kariuki", "Otieno", "Mwikali", "Cheptoo", "Njoki", "Kiplagat", "Owuor",
    "Nyaga", "Muriithi", "Achieng", "Rotich", "Wairimu", "Onduso", "Kiplimo",
    "Musyoka", "Kamande", "Adero", "Chelangat", "Mutiso", "Njue",
]

PRIVATE_INSURERS = [
    ("AAR Insurance", "AAR"),
    ("Britam Health", "BRITAM"),
    ("CIC Insurance Group", "CIC"),
    ("Jubilee Health Insurance", "JUB"),
    ("Madison Insurance", "MADISON"),
    ("Resolution Insurance", "RESOLUTION"),
]

SHA_BENEFIT_CODES = ["SHA-OP-001", "SHA-OP-002", "SHA-IP-010", "SHA-MCH-004", "SHA-EMG-007"]
PRIVATE_BENEFIT_CODES = ["OUTPATIENT", "INPATIENT", "MATERNITY", "DENTAL", "OPTICAL"]

MEMBER_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "SUSPENDED", "LAPSED"]


def rand_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def rand_phone():
    return f"07{random.randint(10000000, 99999999)}"


def rand_national_id():
    return str(random.randint(20000000, 39999999))


def rand_dob():
    days_old = random.randint(365 * 1, 365 * 85)
    return (timezone.now() - timedelta(days=days_old)).date()


class Command(BaseCommand):
    help = "Seed insurers, patient policies, eligibility checks and claims (with backing patients/visits/invoices)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--patients", type=int, default=25,
            help="Number of seed patients to create (default: 25).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete previously seeded data (identified by the SEED-INS tag) before creating new records.",
        )

    def handle(self, *args, **options):
        patient_count = options["patients"]

        if options["flush"]:
            self._flush()

        with transaction.atomic():
            staff = self._get_or_create_staff()
            departments = self._get_or_create_departments()
            insurers = self._get_or_create_insurers()
            patients = self._create_patients(patient_count, staff)
            policies = self._create_policies(patients, insurers, staff)
            visits_invoices = self._create_visits_and_invoices(patients, departments, staff)
            self._create_eligibility_checks(policies, staff)
            self._create_claims(policies, visits_invoices, staff)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(patients)} patients, {len(policies)} policies, "
            f"{len(insurers)} insurers, and their claims/eligibility checks."
        ))

    # ------------------------------------------------------------------
    # Flush
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing previously seeded insurance data...")
        seeded_patients = Patient.all_objects.filter(national_id__startswith=SEED_TAG)
        ClaimItem.all_objects.filter(claim__patient__in=seeded_patients).delete()
        InsuranceClaim.all_objects.filter(patient__in=seeded_patients).delete()
        EligibilityCheck.all_objects.filter(policy__patient__in=seeded_patients).delete()
        PatientInsurancePolicy.all_objects.filter(patient__in=seeded_patients).delete()
        Invoice.all_objects.filter(patient__in=seeded_patients).delete()
        Visit.all_objects.filter(patient__in=seeded_patients).delete()
        seeded_patients.delete()
        self.stdout.write(self.style.WARNING("Flush complete."))

    # ------------------------------------------------------------------
    # Support data
    # ------------------------------------------------------------------
    def _get_or_create_staff(self):
        staff, _ = User.objects.get_or_create(
            username="seed_insurance_bot",
            defaults=dict(
                first_name="Seed",
                last_name="Bot",
                role=Role.RECEPTIONIST,
                is_active_staff=True,
            ),
        )
        return staff

    def _get_or_create_departments(self):
        specs = [
            ("General Medicine", Decimal("500.00")),
            ("Pediatrics", Decimal("600.00")),
            ("Gynecology", Decimal("700.00")),
            ("Dental", Decimal("800.00")),
        ]
        departments = []
        for name, fee in specs:
            dept, _ = Department.objects.get_or_create(
                name=name, defaults=dict(consultation_fee=fee),
            )
            departments.append(dept)
        return departments

    def _get_or_create_insurers(self):
        insurers = []
        sha, _ = Insurer.objects.get_or_create(
            code="SHA",
            defaults=dict(
                name="Social Health Authority (SHA)",
                insurer_type=InsurerType.SHA,
                requires_preauth=True,
                contact_email="support@sha.go.ke",
                contact_phone="0800720601",
                is_active=True,
            ),
        )
        insurers.append(sha)
        for name, code in PRIVATE_INSURERS:
            insurer, _ = Insurer.objects.get_or_create(
                code=code,
                defaults=dict(
                    name=name,
                    insurer_type=InsurerType.PRIVATE,
                    requires_preauth=random.choice([True, False]),
                    contact_email=f"claims@{code.lower()}.co.ke",
                    contact_phone=rand_phone(),
                    is_active=True,
                ),
            )
            insurers.append(insurer)
        return insurers

    # ------------------------------------------------------------------
    # Patients
    # ------------------------------------------------------------------
    def _create_patients(self, count, staff):
        patients = []
        for i in range(count):
            patient = Patient.objects.create(
                full_name=rand_name(),
                gender=random.choice([Gender.MALE, Gender.FEMALE]),
                dob=rand_dob(),
                phone=rand_phone(),
                address=random.choice(["Nairobi", "Kisumu", "Nakuru", "Eldoret", "Mombasa", "Nyeri"]),
                national_id=f"{SEED_TAG}-{rand_national_id()}-{i}",
                created_by=staff,
            )
            patients.append(patient)
        return patients

    # ------------------------------------------------------------------
    # Policies
    # ------------------------------------------------------------------
    def _create_policies(self, patients, insurers, staff):
        sha = next(i for i in insurers if i.insurer_type == InsurerType.SHA)
        private_insurers = [i for i in insurers if i.insurer_type == InsurerType.PRIVATE]

        policies = []
        for patient in patients:
            # Most patients get SHA cover; roughly half also/instead carry a private policy.
            insurer_choices = [sha]
            if random.random() < 0.5:
                insurer_choices.append(random.choice(private_insurers))

            for insurer in insurer_choices:
                is_sha = insurer.insurer_type == InsurerType.SHA
                policy = PatientInsurancePolicy.objects.create(
                    patient=patient,
                    insurer=insurer,
                    member_number=f"{'SHA' if is_sha else insurer.code}-{random.randint(100000, 999999)}",
                    scheme_name="" if is_sha else f"{insurer.name} Corporate Scheme",
                    principal_member_name=patient.full_name,
                    relationship="PRINCIPAL",
                    valid_from=timezone.now().date() - timedelta(days=random.randint(30, 400)),
                    valid_to=timezone.now().date() + timedelta(days=random.randint(30, 400)),
                    is_active=True,
                    registered_by=staff,
                )
                policies.append(policy)
        return policies

    # ------------------------------------------------------------------
    # Visits + Invoices
    # ------------------------------------------------------------------
    def _create_visits_and_invoices(self, patients, departments, staff):
        """Returns a list of (patient, [invoices]) tuples for use when building claims."""
        results = []
        for patient in patients:
            department = random.choice(departments)
            visit = Visit.objects.create(
                patient=patient,
                department=department,
                consultation_type=random.choice(list(ConsultationType)),
                status=random.choice([VisitStatus.COMPLETED, VisitStatus.IN_CONSULTATION]),
                registered_by=staff,
            )

            invoices = [Invoice.objects.create(
                patient=patient,
                visit=visit,
                source_type=InvoiceSourceType.CONSULTATION,
                description=f"Consultation - {department.name}",
                amount=visit.consultation_fee,
                amount_paid=visit.consultation_fee,
                status=InvoiceStatus.PAID,
            )]

            # ~60% of patients also get a lab or pharmacy invoice, useful for
            # building multi-item claims.
            if random.random() < 0.6:
                extra_source = random.choice([InvoiceSourceType.LAB, InvoiceSourceType.PHARMACY])
                extra_amount = Decimal(random.randint(800, 5000))
                invoices.append(Invoice.objects.create(
                    patient=patient,
                    visit=visit,
                    source_type=extra_source,
                    description=f"{extra_source.label} charges",
                    amount=extra_amount,
                    amount_paid=extra_amount,
                    status=InvoiceStatus.PAID,
                ))

            results.append((patient, visit, invoices))
        return results

    # ------------------------------------------------------------------
    # Eligibility checks
    # ------------------------------------------------------------------
    def _create_eligibility_checks(self, policies, staff):
        for policy in policies:
            is_eligible = random.random() < 0.85
            EligibilityCheck.objects.create(
                policy=policy,
                is_eligible=is_eligible,
                scheme_returned=policy.scheme_name or "SHA Comprehensive Package",
                member_status=random.choice(MEMBER_STATUSES) if is_eligible else "SUSPENDED",
                raw_response={
                    "member_number": policy.member_number,
                    "eligible": is_eligible,
                    "checked_via": "mock-gateway",
                },
                checked_by=staff,
            )

    # ------------------------------------------------------------------
    # Claims
    # ------------------------------------------------------------------
    def _create_claims(self, policies, visits_invoices, staff):
        invoices_by_patient = {p.id: (v, invs) for p, v, invs in visits_invoices}

        # Only claim against ~70% of policies (some patients simply pay cash / never claim).
        for policy in policies:
            if random.random() > 0.7:
                continue

            visit, invoices = invoices_by_patient.get(policy.patient_id, (None, []))
            if not invoices:
                continue

            total_claimed = sum((inv.amount for inv in invoices), Decimal("0"))
            status = random.choices(
                [
                    ClaimStatus.DRAFT,
                    ClaimStatus.SUBMITTED,
                    ClaimStatus.UNDER_REVIEW,
                    ClaimStatus.APPROVED,
                    ClaimStatus.PARTIALLY_APPROVED,
                    ClaimStatus.REJECTED,
                    ClaimStatus.SETTLED,
                ],
                weights=[5, 15, 15, 20, 15, 10, 20],
            )[0]

            now = timezone.now()
            submitted_at = now - timedelta(days=random.randint(2, 60))
            responded_at = submitted_at + timedelta(days=random.randint(1, 14)) if status not in (
                ClaimStatus.DRAFT, ClaimStatus.SUBMITTED,
            ) else None
            settled_at = responded_at + timedelta(days=random.randint(1, 10)) if status == ClaimStatus.SETTLED else None

            if status in (ClaimStatus.APPROVED, ClaimStatus.SETTLED):
                total_approved = total_claimed
            elif status == ClaimStatus.PARTIALLY_APPROVED:
                total_approved = (total_claimed * Decimal(random.choice(["0.5", "0.6", "0.75", "0.85"]))).quantize(Decimal("0.01"))
            else:
                total_approved = Decimal("0")

            claim = InsuranceClaim.objects.create(
                patient=policy.patient,
                policy=policy,
                visit=visit,
                status=status,
                total_claimed=total_claimed,
                total_approved=total_approved,
                gateway_reference=f"{policy.insurer.code}-REF-{random.randint(100000, 999999)}"
                if status != ClaimStatus.DRAFT else "",
                submitted_at=submitted_at if status != ClaimStatus.DRAFT else None,
                responded_at=responded_at,
                settled_at=settled_at,
                rejection_reason="Service not covered under active benefit package."
                if status == ClaimStatus.REJECTED else "",
                notes="Auto-generated seed claim.",
                created_by=staff,
            )

            is_sha = policy.insurer.insurer_type == InsurerType.SHA
            benefit_codes = SHA_BENEFIT_CODES if is_sha else PRIVATE_BENEFIT_CODES
            approved_ratio = (total_approved / total_claimed) if total_claimed else Decimal("0")

            for inv in invoices:
                item_approved = (inv.amount * approved_ratio).quantize(Decimal("0.01"))
                ClaimItem.objects.create(
                    claim=claim,
                    invoice=inv,
                    benefit_code=random.choice(benefit_codes),
                    amount_claimed=inv.amount,
                    amount_approved=item_approved,
                )