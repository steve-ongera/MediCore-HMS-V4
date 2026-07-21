import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import (
    User,
    Role,
    Patient,
    Gender,
    Invoice,
    InvoiceSourceType,
    InvoiceStatus,
)
from dental.models import (
    FDI_TOOTH_CHOICES,
    DentalProcedureCatalog,
    DentalVisit,
    ToothCondition,
    ToothChart,
    TreatmentPlanStatus,
    DentalTreatmentPlan,
    DentalProcedureRecord,
)

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

CHIEF_COMPLAINTS = [
    "Toothache on lower right molar",
    "Bleeding gums for the past week",
    "Sensitivity to cold and sweet foods",
    "Broken filling",
    "Routine dental check-up",
    "Swelling on the jaw",
    "Wisdom tooth pain",
]

# Seed catalog: (code, name, price)
PROCEDURE_CATALOG = [
    ("DEN-001", "Oral Examination", Decimal("1000.00")),
    ("DEN-002", "Scaling & Polishing", Decimal("2500.00")),
    ("DEN-003", "Simple Extraction", Decimal("2000.00")),
    ("DEN-004", "Surgical Extraction", Decimal("6000.00")),
    ("DEN-005", "Composite Filling", Decimal("3500.00")),
    ("DEN-006", "Root Canal Treatment", Decimal("15000.00")),
    ("DEN-007", "Crown Fitting", Decimal("18000.00")),
    ("DEN-008", "Dental X-Ray", Decimal("1500.00")),
    ("DEN-009", "Fluoride Treatment", Decimal("1200.00")),
]

# Conditions that are realistic to end up planning treatment for, mapped to
# the procedure codes above that would sensibly address them.
CONDITION_PROCEDURES = {
    ToothCondition.CARIES: ["DEN-005", "DEN-006"],
    ToothCondition.FRACTURED: ["DEN-004", "DEN-007"],
    ToothCondition.IMPACTED: ["DEN-004"],
    ToothCondition.ROOT_CANAL_TREATED: ["DEN-007"],
}


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


class Command(BaseCommand):
    help = (
        "Seed the dental module with demo procedure catalog entries, "
        "dental visits, tooth charts, treatment plans and procedure "
        "records. Creates its own supporting Patient and Invoice records "
        "so the module can be demoed end-to-end on its own."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--visits", type=int, default=12,
            help="Number of DentalVisit records to create (default: 12).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete previously seeded dental data (by the SEED- "
                 "prefixed identifiers this command uses) before reseeding.",
        )

    def handle(self, *args, **options):
        visit_count = options["visits"]

        with transaction.atomic():
            if options["flush"]:
                self._flush()

            staff = self._get_or_create_staff(role=Role.DOCTOR, username="seed.dentist", label="Dentist")
            front_desk = self._get_or_create_staff(role=Role.RECEPTIONIST, username="seed.dental_reception", label="Receptionist")

            catalog = self._create_catalog()
            patients = self._create_patients(visit_count)
            visits = self._create_visits(patients, staff, front_desk)
            charts = self._create_tooth_charts(visits, staff)
            plans = self._create_treatment_plans(visits, charts, catalog, staff)
            records = self._create_procedure_records(plans, staff)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(catalog)} catalog items, {len(visits)} visits, "
            f"{len(charts)} tooth chart entries, {len(plans)} treatment "
            f"plan items, {len(records)} completed procedure records."
        ))

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing previously seeded dental data...")
        DentalProcedureRecord.objects.filter(
            treatment_plan__dental_visit__visit_number__startswith="SEED"
        ).delete()
        DentalTreatmentPlan.objects.filter(dental_visit__visit_number__startswith="SEED").delete()
        ToothChart.objects.filter(dental_visit__visit_number__startswith="SEED").delete()
        DentalVisit.objects.filter(visit_number__startswith="SEED").delete()
        Invoice.objects.filter(description__startswith="[SEED]").delete()
        Patient.objects.filter(hospital_number__startswith="SEED-DENTAL").delete()

    # ------------------------------------------------------------------
    # Supporting records
    # ------------------------------------------------------------------
    def _get_or_create_staff(self, role, username, label):
        user, created = User.objects.get_or_create(
            username=username,
            defaults=dict(
                first_name="Seed",
                last_name=label,
                role=role,
                email=f"{username}@example.local",
                is_active_staff=True,
            ),
        )
        if created:
            user.set_password("ChangeMe123!")
            user.save()
            self.stdout.write(f"Created seed staff user '{username}'.")
        return user

    def _create_catalog(self):
        items = []
        for code, name, price in PROCEDURE_CATALOG:
            item, _ = DentalProcedureCatalog.objects.get_or_create(
                code=code,
                defaults=dict(name=name, price=price, is_active=True),
            )
            items.append(item)
        return items

    def _create_patients(self, count):
        patients = []
        for i in range(1, count + 1):
            hospital_number = f"SEED-DENTAL-{i:04d}"
            patient, _ = Patient.objects.get_or_create(
                hospital_number=hospital_number,
                defaults=dict(
                    full_name=random_name(),
                    gender=random.choice([Gender.MALE, Gender.FEMALE]),
                    phone=f"07{random.randint(10000000, 99999999)}",
                ),
            )
            patients.append(patient)
        return patients

    # ------------------------------------------------------------------
    # Visits / tooth charts
    # ------------------------------------------------------------------
    def _create_visits(self, patients, dentist, front_desk):
        visits = []
        for idx, patient in enumerate(patients, start=1):
            visit_number = f"SEED-DEN-{idx:04d}"
            visit, created = DentalVisit.objects.get_or_create(
                visit_number=visit_number,
                defaults=dict(
                    patient=patient,
                    dentist=dentist,
                    chief_complaint=random.choice(CHIEF_COMPLAINTS),
                    clinical_notes="Seed data - routine dental encounter.",
                    registered_by=front_desk,
                ),
            )
            visits.append(visit)
        return visits

    def _create_tooth_charts(self, visits, dentist):
        """Chart 2-5 teeth per visit, weighted toward healthy with a mix of findings."""
        weighted_conditions = (
            [ToothCondition.HEALTHY] * 6
            + [ToothCondition.CARIES] * 3
            + [ToothCondition.FILLED] * 2
            + [ToothCondition.MISSING] * 1
            + [ToothCondition.FRACTURED] * 1
            + [ToothCondition.IMPACTED] * 1
            + [ToothCondition.ROOT_CANAL_TREATED] * 1
        )
        all_tooth_numbers = [choice[0] for choice in FDI_TOOTH_CHOICES]
        charts = []
        for visit in visits:
            teeth_examined = random.sample(all_tooth_numbers, k=random.randint(2, 5))
            for tooth_number in teeth_examined:
                chart, created = ToothChart.objects.get_or_create(
                    dental_visit=visit,
                    tooth_number=tooth_number,
                    defaults=dict(
                        condition=random.choice(weighted_conditions),
                        notes="Seed data.",
                        recorded_by=dentist,
                    ),
                )
                charts.append(chart)
        return charts

    # ------------------------------------------------------------------
    # Treatment plans / procedure records
    # ------------------------------------------------------------------
    def _create_treatment_plans(self, visits, charts, catalog, dentist):
        catalog_by_code = {item.code: item for item in catalog}
        charts_by_visit = {}
        for chart in charts:
            charts_by_visit.setdefault(chart.dental_visit_id, []).append(chart)

        plans = []
        for visit in visits:
            sequence = 1
            findings = [
                c for c in charts_by_visit.get(visit.id, [])
                if c.condition in CONDITION_PROCEDURES
            ]

            for chart in findings:
                codes = CONDITION_PROCEDURES[chart.condition]
                procedure = catalog_by_code[random.choice(codes)]
                plan, created = DentalTreatmentPlan.objects.get_or_create(
                    dental_visit=visit,
                    tooth_number=chart.tooth_number,
                    procedure=procedure,
                    defaults=dict(
                        sequence=sequence,
                        status=random.choice(list(TreatmentPlanStatus.values)),
                        notes="Seed data - planned from tooth chart finding.",
                        planned_by=dentist,
                    ),
                )
                plans.append(plan)
                sequence += 1

            # Every visit also gets a whole-mouth item (exam or scaling),
            # matching how a real clinic bills nearly every visit.
            whole_mouth_procedure = catalog_by_code[random.choice(["DEN-001", "DEN-002", "DEN-008", "DEN-009"])]
            plan, created = DentalTreatmentPlan.objects.get_or_create(
                dental_visit=visit,
                tooth_number="",
                procedure=whole_mouth_procedure,
                defaults=dict(
                    sequence=sequence,
                    status=TreatmentPlanStatus.COMPLETED,
                    notes="Seed data - whole-mouth procedure.",
                    planned_by=dentist,
                ),
            )
            plans.append(plan)

        return plans

    def _create_procedure_records(self, plans, dentist):
        """Execute + bill every plan item marked COMPLETED (or IN_PROGRESS, some of the time)."""
        records = []
        for plan in plans:
            should_execute = (
                plan.status == TreatmentPlanStatus.COMPLETED
                or (plan.status == TreatmentPlanStatus.IN_PROGRESS and random.random() < 0.5)
            )
            if not should_execute:
                continue
            if hasattr(plan, "procedure_record"):
                continue  # already executed (idempotent reruns)

            invoice = Invoice.objects.create(
                patient=plan.dental_visit.patient,
                visit=plan.dental_visit.visit,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"[SEED] {plan.procedure.name} - {plan.dental_visit.visit_number}",
                amount=plan.procedure.price,
                amount_paid=Decimal("0.00"),
                status=InvoiceStatus.UNPAID,
            )

            record = DentalProcedureRecord.objects.create(
                treatment_plan=plan,
                performed_by=dentist,
                notes="Seed data - procedure completed and billed.",
                invoice=invoice,
            )
            records.append(record)

        return records