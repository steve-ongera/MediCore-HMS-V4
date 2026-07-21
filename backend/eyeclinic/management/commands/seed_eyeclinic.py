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
from eyeclinic.models import (
    EyeProcedureCatalog,
    EyeVisit,
    EyeExamination,
    LensType,
    SpectaclePrescription,
    EyeTreatmentPlanStatus,
    EyeTreatmentPlan,
    EyeProcedureRecord,
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
    "Blurred distance vision",
    "Difficulty reading fine print",
    "Red, itchy eyes",
    "Eye pain and sensitivity to light",
    "Routine eye check-up",
    "Foreign body sensation in the eye",
    "Gradual vision loss",
    "Headaches associated with near work",
]

VISUAL_ACUITY_OPTIONS = ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM"]

# Seed catalog: (code, name, price)
PROCEDURE_CATALOG = [
    ("EYE-001", "Comprehensive Eye Examination", Decimal("1500.00")),
    ("EYE-002", "Refraction / Vision Test", Decimal("800.00")),
    ("EYE-003", "Tonometry (IOP Measurement)", Decimal("600.00")),
    ("EYE-004", "Fundoscopy", Decimal("1200.00")),
    ("EYE-005", "Cataract Surgery", Decimal("45000.00")),
    ("EYE-006", "Pterygium Excision", Decimal("18000.00")),
    ("EYE-007", "Foreign Body Removal", Decimal("2500.00")),
    ("EYE-008", "Laser Photocoagulation", Decimal("25000.00")),
    ("EYE-009", "Glaucoma Follow-up", Decimal("1000.00")),
]

# Diagnoses paired with a plausible procedure code to plan treatment for.
DIAGNOSIS_PROCEDURES = {
    "Cataract, visually significant": "EYE-005",
    "Pterygium, encroaching on cornea": "EYE-006",
    "Corneal foreign body": "EYE-007",
    "Diabetic retinopathy": "EYE-008",
    "Chronic open-angle glaucoma": "EYE-009",
}


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_refraction():
    """Return a plausible (sphere, cylinder, axis) tuple, or (None, None, None) for emmetropic eyes."""
    if random.random() < 0.25:
        return None, None, None
    sphere = Decimal(str(round(random.uniform(-6.0, 4.0), 2)))
    cylinder = Decimal(str(round(random.uniform(-2.0, 0.0), 2))) if random.random() < 0.6 else None
    axis = random.randint(1, 180) if cylinder is not None else None
    return sphere, cylinder, axis


class Command(BaseCommand):
    help = (
        "Seed the eye clinic module with demo procedure catalog entries, "
        "eye visits, examinations, spectacle prescriptions, treatment "
        "plans and procedure records. Creates its own supporting Patient "
        "and Invoice records so the module can be demoed end-to-end on "
        "its own."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--visits", type=int, default=12,
            help="Number of EyeVisit records to create (default: 12).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete previously seeded eye clinic data (by the SEED- "
                 "prefixed identifiers this command uses) before reseeding.",
        )

    def handle(self, *args, **options):
        visit_count = options["visits"]

        with transaction.atomic():
            if options["flush"]:
                self._flush()

            ophthalmologist = self._get_or_create_staff(role=Role.DOCTOR, username="seed.ophthalmologist", label="Ophthalmologist")
            front_desk = self._get_or_create_staff(role=Role.RECEPTIONIST, username="seed.eye_reception", label="Receptionist")

            catalog = self._create_catalog()
            patients = self._create_patients(visit_count)
            visits = self._create_visits(patients, ophthalmologist, front_desk)
            examinations = self._create_examinations(visits, ophthalmologist)
            prescriptions = self._create_spectacle_prescriptions(visits, examinations, ophthalmologist)
            plans = self._create_treatment_plans(visits, examinations, catalog, ophthalmologist)
            records = self._create_procedure_records(plans, ophthalmologist)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(catalog)} catalog items, {len(visits)} visits, "
            f"{len(examinations)} examinations, {len(prescriptions)} "
            f"spectacle prescriptions, {len(plans)} treatment plan items, "
            f"{len(records)} completed procedure records."
        ))

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing previously seeded eye clinic data...")
        EyeProcedureRecord.objects.filter(
            treatment_plan__eye_visit__visit_number__startswith="SEED"
        ).delete()
        EyeTreatmentPlan.objects.filter(eye_visit__visit_number__startswith="SEED").delete()
        SpectaclePrescription.objects.filter(eye_visit__visit_number__startswith="SEED").delete()
        EyeExamination.objects.filter(eye_visit__visit_number__startswith="SEED").delete()
        EyeVisit.objects.filter(visit_number__startswith="SEED").delete()
        Invoice.objects.filter(description__startswith="[SEED]").delete()
        Patient.objects.filter(hospital_number__startswith="SEED-EYE").delete()

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
            item, _ = EyeProcedureCatalog.objects.get_or_create(
                code=code,
                defaults=dict(name=name, price=price, is_active=True),
            )
            items.append(item)
        return items

    def _create_patients(self, count):
        patients = []
        for i in range(1, count + 1):
            hospital_number = f"SEED-EYE-{i:04d}"
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
    # Visits / examinations
    # ------------------------------------------------------------------
    def _create_visits(self, patients, ophthalmologist, front_desk):
        visits = []
        for idx, patient in enumerate(patients, start=1):
            visit_number = f"SEED-EYE-{idx:04d}"
            visit, created = EyeVisit.objects.get_or_create(
                visit_number=visit_number,
                defaults=dict(
                    patient=patient,
                    ophthalmologist=ophthalmologist,
                    chief_complaint=random.choice(CHIEF_COMPLAINTS),
                    clinical_notes="Seed data - routine eye clinic encounter.",
                    registered_by=front_desk,
                ),
            )
            visits.append(visit)
        return visits

    def _create_examinations(self, visits, ophthalmologist):
        examinations = []
        for visit in visits:
            sphere_od, cylinder_od, axis_od = random_refraction()
            sphere_os, cylinder_os, axis_os = random_refraction()

            # Occasionally give a visit a notable diagnosis that later
            # drives a treatment plan; otherwise leave it a routine visit.
            diagnosis = ""
            if random.random() < 0.4:
                diagnosis = random.choice(list(DIAGNOSIS_PROCEDURES.keys()))

            examination, created = EyeExamination.objects.get_or_create(
                eye_visit=visit,
                defaults=dict(
                    visual_acuity_od=random.choice(VISUAL_ACUITY_OPTIONS),
                    visual_acuity_os=random.choice(VISUAL_ACUITY_OPTIONS),
                    iop_od=Decimal(str(round(random.uniform(10.0, 22.0), 1))),
                    iop_os=Decimal(str(round(random.uniform(10.0, 22.0), 1))),
                    sphere_od=sphere_od,
                    cylinder_od=cylinder_od,
                    axis_od=axis_od,
                    sphere_os=sphere_os,
                    cylinder_os=cylinder_os,
                    axis_os=axis_os,
                    anterior_segment_notes="Seed data - anterior segment unremarkable.",
                    posterior_segment_notes="Seed data - posterior segment unremarkable.",
                    diagnosis=diagnosis,
                    examined_by=ophthalmologist,
                ),
            )
            examinations.append(examination)
        return examinations

    def _create_spectacle_prescriptions(self, visits, examinations, ophthalmologist):
        """Issue a spectacle prescription for visits whose exam shows a real refractive error."""
        exam_by_visit = {exam.eye_visit_id: exam for exam in examinations}
        prescriptions = []
        for visit in visits:
            exam = exam_by_visit.get(visit.id)
            if not exam or (exam.sphere_od is None and exam.sphere_os is None):
                continue  # emmetropic - no glasses needed

            lens_type = random.choice(list(LensType.values))
            price = {
                LensType.SINGLE_VISION: Decimal("3500.00"),
                LensType.BIFOCAL: Decimal("6500.00"),
                LensType.PROGRESSIVE: Decimal("9500.00"),
                LensType.READING: Decimal("2500.00"),
            }[lens_type]

            invoice = Invoice.objects.create(
                patient=visit.patient,
                visit=visit.visit,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"[SEED] Spectacle prescription - {visit.visit_number}",
                amount=price,
                amount_paid=Decimal("0.00"),
                status=InvoiceStatus.UNPAID,
            )

            prescription = SpectaclePrescription.objects.create(
                eye_visit=visit,
                lens_type=lens_type,
                sphere_od=exam.sphere_od,
                cylinder_od=exam.cylinder_od,
                axis_od=exam.axis_od,
                add_od=Decimal("1.50") if lens_type in (LensType.BIFOCAL, LensType.PROGRESSIVE) else None,
                sphere_os=exam.sphere_os,
                cylinder_os=exam.cylinder_os,
                axis_os=exam.axis_os,
                add_os=Decimal("1.50") if lens_type in (LensType.BIFOCAL, LensType.PROGRESSIVE) else None,
                pupillary_distance_mm=Decimal(str(round(random.uniform(56.0, 68.0), 1))),
                price=price,
                notes="Seed data - dispensed spectacle prescription.",
                prescribed_by=ophthalmologist,
                invoice=invoice,
            )
            prescriptions.append(prescription)
        return prescriptions

    # ------------------------------------------------------------------
    # Treatment plans / procedure records
    # ------------------------------------------------------------------
    def _create_treatment_plans(self, visits, examinations, catalog, ophthalmologist):
        catalog_by_code = {item.code: item for item in catalog}
        exam_by_visit = {exam.eye_visit_id: exam for exam in examinations}

        plans = []
        for visit in visits:
            exam = exam_by_visit.get(visit.id)

            # Diagnosis-driven procedure, if the exam flagged one.
            if exam and exam.diagnosis in DIAGNOSIS_PROCEDURES:
                procedure = catalog_by_code[DIAGNOSIS_PROCEDURES[exam.diagnosis]]
                plan, created = EyeTreatmentPlan.objects.get_or_create(
                    eye_visit=visit,
                    procedure=procedure,
                    defaults=dict(
                        eye=random.choice(["OD", "OS", "BOTH"]),
                        status=random.choice(list(EyeTreatmentPlanStatus.values)),
                        notes=f"Seed data - planned for {exam.diagnosis}.",
                        planned_by=ophthalmologist,
                    ),
                )
                plans.append(plan)

            # Every visit also gets a baseline diagnostic item.
            baseline_procedure = catalog_by_code[random.choice(["EYE-001", "EYE-002", "EYE-003", "EYE-004"])]
            baseline_plan, created = EyeTreatmentPlan.objects.get_or_create(
                eye_visit=visit,
                procedure=baseline_procedure,
                defaults=dict(
                    eye="BOTH",
                    status=EyeTreatmentPlanStatus.COMPLETED,
                    notes="Seed data - baseline diagnostic procedure.",
                    planned_by=ophthalmologist,
                ),
            )
            plans.append(baseline_plan)

        return plans

    def _create_procedure_records(self, plans, ophthalmologist):
        """Execute + bill every plan item marked COMPLETED."""
        records = []
        for plan in plans:
            if plan.status != EyeTreatmentPlanStatus.COMPLETED:
                continue
            if hasattr(plan, "procedure_record"):
                continue  # already executed (idempotent reruns)

            invoice = Invoice.objects.create(
                patient=plan.eye_visit.patient,
                visit=plan.eye_visit.visit,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"[SEED] {plan.procedure.name} ({plan.eye}) - {plan.eye_visit.visit_number}",
                amount=plan.procedure.price,
                amount_paid=Decimal("0.00"),
                status=InvoiceStatus.UNPAID,
            )

            record = EyeProcedureRecord.objects.create(
                treatment_plan=plan,
                performed_by=ophthalmologist,
                notes="Seed data - procedure completed and billed.",
                invoice=invoice,
            )
            records.append(record)

        return records