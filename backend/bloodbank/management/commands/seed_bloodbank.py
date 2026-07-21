import random
from datetime import date, timedelta
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
    Invoice,
    InvoiceSourceType,
    InvoiceStatus,
)
from bloodbank.models import (
    BloodGroup,
    COMPATIBILITY_MAP,
    DonorStatus,
    BloodDonor,
    BloodDonation,
    ComponentType,
    UnitStatus,
    BloodUnit,
    RequestPriority,
    RequestStatus,
    BloodRequest,
    BloodIssue,
)

# Component shelf life, in days from collection, used to compute expiry_date.
SHELF_LIFE_DAYS = {
    ComponentType.WHOLE_BLOOD: 35,
    ComponentType.PACKED_RED_CELLS: 42,
    ComponentType.PLATELETS: 5,
    ComponentType.FRESH_FROZEN_PLASMA: 365,
    ComponentType.CRYOPRECIPITATE: 365,
}

# Rough unit prices (KES) per component, used only for demo invoices.
UNIT_PRICE = {
    ComponentType.WHOLE_BLOOD: Decimal("4500.00"),
    ComponentType.PACKED_RED_CELLS: Decimal("5200.00"),
    ComponentType.PLATELETS: Decimal("6800.00"),
    ComponentType.FRESH_FROZEN_PLASMA: Decimal("3000.00"),
    ComponentType.CRYOPRECIPITATE: Decimal("3500.00"),
}

FIRST_NAMES = [
    "Wanjiru", "Otieno", "Kamau", "Achieng", "Mutiso", "Njeri", "Kiptoo",
    "Wafula", "Nyambura", "Onyango", "Chebet", "Kariuki", "Adhiambo",
    "Mwangi", "Wambui", "Barasa", "Cherono", "Muthoni", "Odhiambo", "Njoroge",
]
LAST_NAMES = [
    "Omondi", "Kimani", "Auma", "Maina", "Akinyi", "Ochieng", "Wekesa",
    "Njuguna", "Atieno", "Rotich", "Gitau", "Mbugua", "Korir", "Owino",
    "Mureithi", "Wairimu", "Cheruiyot", "Ndungu",
]

DEFERRAL_REASONS = [
    "Low hemoglobin on screening",
    "Recent tattoo / piercing (< 6 months)",
    "Recovering from malaria",
    "On antibiotics",
    "Recent pregnancy / breastfeeding",
]

CLINICAL_INDICATIONS = [
    "Postpartum hemorrhage",
    "Severe anemia secondary to malaria",
    "Road traffic accident with major blood loss",
    "Pre-operative cross-match for elective surgery",
    "Gastrointestinal bleed",
    "Sickle cell crisis, exchange transfusion",
    "Ruptured ectopic pregnancy",
]


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_dob(min_age=18, max_age=60):
    age = random.randint(min_age, max_age)
    days_offset = random.randint(0, 364)
    return date.today() - timedelta(days=age * 365 + days_offset)


class Command(BaseCommand):
    help = (
        "Seed the blood bank module with demo donors, donations, units, "
        "requests and issues. Creates its own supporting Patient and "
        "Invoice records so the module can be demoed end-to-end without "
        "requiring data from other modules first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--donors", type=int, default=15,
            help="Number of BloodDonor records to create (default: 15).",
        )
        parser.add_argument(
            "--requests", type=int, default=8,
            help="Number of BloodRequest records to create (default: 8).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete previously seeded blood bank data (by the SEED- "
                 "prefixed identifiers this command uses) before reseeding.",
        )

    def handle(self, *args, **options):
        donor_count = options["donors"]
        request_count = options["requests"]

        with transaction.atomic():
            if options["flush"]:
                self._flush()

            staff = self._get_or_create_staff()
            department = self._get_or_create_department()

            donor_patients = self._create_patients(donor_count, "SEED-DONOR")
            donors = self._create_donors(donor_patients, staff)
            donations = self._create_donations(donors, staff)
            units = self._create_units(donations)

            recipient_patients = self._create_patients(request_count, "SEED-RECIP")
            requests = self._create_requests(recipient_patients, staff, department)
            issued = self._issue_units(requests, units, staff)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(donors)} donors, {len(donations)} donations, "
            f"{len(units)} units, {len(requests)} requests, "
            f"{issued} issues."
        ))

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing previously seeded blood bank data...")
        BloodIssue.objects.filter(request__request_number__startswith="SEED").delete()
        BloodUnit.objects.filter(donation__donor__donor_number__startswith="SEED").delete()
        BloodDonation.objects.filter(donor__donor_number__startswith="SEED").delete()
        BloodDonor.objects.filter(donor_number__startswith="SEED").delete()
        BloodRequest.objects.filter(request_number__startswith="SEED").delete()
        Invoice.objects.filter(description__startswith="[SEED]").delete()
        Patient.objects.filter(hospital_number__startswith="SEED-").delete()

    # ------------------------------------------------------------------
    # Supporting records
    # ------------------------------------------------------------------
    def _get_or_create_staff(self):
        user, created = User.objects.get_or_create(
            username="seed.bloodbank",
            defaults=dict(
                first_name="Blood",
                last_name="Bank Seeder",
                role=Role.LAB_TECHNOLOGIST,
                email="seed.bloodbank@example.local",
                is_active_staff=True,
            ),
        )
        if created:
            user.set_password("ChangeMe123!")
            user.save()
            self.stdout.write("Created seed staff user 'seed.bloodbank'.")
        return user

    def _get_or_create_department(self):
        department, _ = Department.objects.get_or_create(
            name="Blood Bank",
            defaults=dict(
                consultation_fee=Decimal("0.00"),
                description="Blood collection, screening, storage and issue.",
            ),
        )
        return department

    def _create_patients(self, count, prefix):
        """Create demo patients with hospital numbers we can recognise and clean up later."""
        patients = []
        for i in range(1, count + 1):
            hospital_number = f"{prefix}-{i:04d}"
            patient, _ = Patient.objects.get_or_create(
                hospital_number=hospital_number,
                defaults=dict(
                    full_name=random_name(),
                    gender=random.choice([Gender.MALE, Gender.FEMALE]),
                    dob=random_dob(),
                    phone=f"07{random.randint(10000000, 99999999)}",
                ),
            )
            patients.append(patient)
        return patients

    # ------------------------------------------------------------------
    # Donors / donations / units
    # ------------------------------------------------------------------
    def _create_donors(self, patients, staff):
        donors = []
        for idx, patient in enumerate(patients, start=1):
            donor_number = f"SEED-DNR-{idx:04d}"
            # Most donors are eligible; a few are temporarily/permanently deferred.
            roll = random.random()
            if roll < 0.10:
                status = DonorStatus.PERMANENTLY_DEFERRED
                deferred_until = None
                reason = "Confirmed transfusion-transmissible infection on screening"
            elif roll < 0.25:
                status = DonorStatus.TEMPORARILY_DEFERRED
                deferred_until = date.today() + timedelta(days=random.randint(7, 90))
                reason = random.choice(DEFERRAL_REASONS)
            else:
                status = DonorStatus.ELIGIBLE
                deferred_until = None
                reason = ""

            donor, created = BloodDonor.objects.get_or_create(
                donor_number=donor_number,
                defaults=dict(
                    patient=patient,
                    full_name=patient.full_name,
                    national_id=str(random.randint(20000000, 39999999)),
                    phone=patient.phone,
                    date_of_birth=patient.dob,
                    blood_group=random.choice(list(BloodGroup.values)),
                    status=status,
                    deferral_reason=reason,
                    deferred_until=deferred_until,
                    registered_by=staff,
                ),
            )
            donors.append(donor)
        return donors

    def _create_donations(self, donors, staff):
        donations = []
        for donor in donors:
            if donor.status == DonorStatus.PERMANENTLY_DEFERRED:
                continue  # permanently deferred donors don't donate
            # Eligible / recently-eligible donors give 1-2 donations.
            for _ in range(random.randint(1, 2)):
                donation = BloodDonation.objects.create(
                    donor=donor,
                    volume_ml=random.choice([350, 400, 450]),
                    hemoglobin_level=Decimal(str(round(random.uniform(12.0, 16.5), 1))),
                    collected_by=staff,
                    notes="Seed data - routine donation.",
                )
                donations.append(donation)
        return donations

    def _create_units(self, donations):
        units = []
        for donation in donations:
            component_type = random.choice(list(ComponentType.values))
            collection_date = donation.donation_date.date()
            shelf_days = SHELF_LIFE_DAYS[component_type]
            expiry_date = collection_date + timedelta(days=shelf_days)

            # Simulate a realistic status distribution.
            roll = random.random()
            if roll < 0.15:
                status = UnitStatus.QUARANTINED
                screening_passed = None
            elif roll < 0.20:
                status = UnitStatus.DISCARDED
                screening_passed = False
            else:
                status = UnitStatus.AVAILABLE
                screening_passed = True

            unit = BloodUnit.objects.create(
                donation=donation,
                blood_group=donation.donor.blood_group,
                component_type=component_type,
                volume_ml=donation.volume_ml,
                collection_date=collection_date,
                expiry_date=expiry_date,
                status=status,
                screening_passed=screening_passed,
                screening_notes="Seed data - passed standard TTI panel." if screening_passed else "",
                unit_price=UNIT_PRICE[component_type],
            )
            units.append(unit)
        return units

    # ------------------------------------------------------------------
    # Requests / issues
    # ------------------------------------------------------------------
    def _create_requests(self, patients, staff, department):
        requests = []
        for idx, patient in enumerate(patients, start=1):
            request_number = f"SEED-REQ-{idx:04d}"
            request, created = BloodRequest.objects.get_or_create(
                request_number=request_number,
                defaults=dict(
                    patient=patient,
                    patient_blood_group=random.choice(list(BloodGroup.values)),
                    component_type=random.choice(list(ComponentType.values)),
                    units_requested=random.randint(1, 3),
                    priority=random.choice(list(RequestPriority.values)),
                    clinical_indication=random.choice(CLINICAL_INDICATIONS),
                    status=RequestStatus.PENDING,
                    requested_by=staff,
                ),
            )
            requests.append(request)
        return requests

    def _issue_units(self, requests, units, staff):
        """
        For each request, try to find enough compatible, available units of
        the same component type and issue them, generating one Invoice per
        request that gets fulfilled (even partially).
        """
        # Only ever consider units that are actually available.
        available_units = [u for u in units if u.status == UnitStatus.AVAILABLE]
        issued_count = 0

        for req in requests:
            compatible_groups = COMPATIBILITY_MAP.get(req.patient_blood_group, [])
            candidates = [
                u for u in available_units
                if u.component_type == req.component_type
                and u.blood_group in compatible_groups
                and not u.is_expired
            ]
            if not candidates:
                req.status = RequestStatus.PENDING
                req.save(update_fields=["status"])
                continue

            to_issue = candidates[: req.units_requested]
            invoice_amount = sum((u.unit_price for u in to_issue), Decimal("0.00"))

            invoice = Invoice.objects.create(
                patient=req.patient,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"[SEED] Blood issue for request {req.request_number}",
                amount=invoice_amount,
                amount_paid=Decimal("0.00"),
                status=InvoiceStatus.UNPAID,
            )

            for unit in to_issue:
                BloodIssue.objects.create(
                    request=req,
                    unit=unit,
                    cross_match_compatible=True,
                    issued_by=staff,
                    invoice=invoice,
                    notes="Seed data - cross-matched and issued.",
                )
                unit.status = UnitStatus.ISSUED
                unit.save(update_fields=["status"])
                available_units.remove(unit)
                issued_count += 1

            req.status = (
                RequestStatus.ISSUED
                if len(to_issue) >= req.units_requested
                else RequestStatus.CROSS_MATCHED
            )
            req.save(update_fields=["status"])

        return issued_count