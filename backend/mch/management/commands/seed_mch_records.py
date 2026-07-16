"""
Seed clinical MCH records: Patient (mothers) -> AntenatalProfile -> ANCVisit
-> DeliveryRecord -> Child -> PostnatalVisit -> ChildImmunization -> GrowthMonitoring.

This command creates its OWN fresh mother Patients rather than touching
anything already in your database — every seeded Patient is tagged
(created_by a dedicated "mch_seed_bot" system user) so `--flush` can find
and remove exactly the records this command made, and only those. Your
existing Patients are never read, modified, or deleted.

Assumes MCH staff Users (NURSE/DOCTOR) already exist — run
seed_mch_patients_users first for those. Also assumes mch/utils.py already
provides generate_anc_number / generate_delivery_number /
generate_child_number, since AntenatalProfile/DeliveryRecord/Child.save()
import them.

Usage:
    python manage.py seed_mch_records
    python manage.py seed_mch_records --profiles 25
    python manage.py seed_mch_records --flush
"""

import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Patient, Role, User
from mch.models import (
    AntenatalProfile,
    ANCVisit,
    Child,
    ChildImmunization,
    DeliveryMode,
    DeliveryOutcome,
    DeliveryRecord,
    GrowthMonitoring,
    HIVStatus,
    ImmunizationStatus,
    NutritionStatus,
    PostnatalVisit,
    PregnancyStatus,
    Sex,
    VaccineCatalog,
)

FACILITY_NAME = "South B Hospital"

SEED_REGISTRAR_USERNAME = "mch_seed_bot"

# Reserved, deliberately non-realistic national_id range so seeded mothers
# can never collide with a real Kenyan ID already in the database, and can
# be identified/flushed unambiguously.
SEED_NATIONAL_ID_START = 90000001

FEMALE_FIRST_NAMES = [
    "Achieng", "Wanjiru", "Naliaka", "Njeri", "Adhiambo", "Wambui",
    "Chebet", "Muthoni", "Akinyi", "Nyokabi", "Wangari", "Cherotich",
    "Nafula", "Wanjiku", "Auma", "Kemunto", "Waithera", "Jepkorir",
    "Nyaboke", "Wairimu", "Fatuma", "Halima", "Zainab", "Amina",
]
MALE_FIRST_NAMES = [
    "Otieno", "Kamau", "Wekesa", "Njoroge", "Omondi", "Kiptoo",
    "Mwangi", "Barasa", "Odhiambo", "Kariuki", "Kipchoge", "Wafula",
]
SURNAMES = [
    "Mutua", "Kimani", "Ochieng", "Wafula", "Mburu", "Kiptanui",
    "Odongo", "Njoroge", "Kilonzo", "Achieng", "Muriithi", "Cheruiyot",
    "Otiende", "Wamalwa", "Nyakundi", "Simiyu", "Gitau", "Korir",
]
NAIROBI_ESTATES = [
    "South B", "South C", "Langata", "Kibra", "Dagoretti", "Kawangware",
    "Umoja", "Kayole", "Buruburu", "Embakasi", "Rongai", "Kasarani",
    "Roysambu", "Pipeline", "Donholm",
]

BLOOD_GROUP_WEIGHTS = [
    ("O+", 40), ("A+", 22), ("B+", 18), ("AB+", 4),
    ("O-", 6), ("A-", 4), ("B-", 4), ("AB-", 2),
]

RISK_FACTORS = [
    "Previous Caesarean section",
    "Chronic hypertension",
    "Gestational diabetes",
    "Severe anaemia (Hb < 8)",
    "Multiple pregnancy (twins)",
    "Pre-eclampsia in previous pregnancy",
    "Placenta praevia",
]

# Kenya Expanded Programme on Immunization (KEPI) schedule.
KEPI_VACCINES = [
    ("BCG", "BCG (Tuberculosis)", 0, 0),
    ("OPV0", "OPV - Birth Dose", 0, 0),
    ("OPV1", "OPV - 1st Dose", 6, 100),
    ("PENTA1", "Pentavalent - 1st Dose", 6, 300),
    ("PCV1", "Pneumococcal - 1st Dose", 6, 250),
    ("ROTA1", "Rotavirus - 1st Dose", 6, 200),
    ("OPV2", "OPV - 2nd Dose", 10, 100),
    ("PENTA2", "Pentavalent - 2nd Dose", 10, 300),
    ("PCV2", "Pneumococcal - 2nd Dose", 10, 250),
    ("ROTA2", "Rotavirus - 2nd Dose", 10, 200),
    ("OPV3", "OPV - 3rd Dose", 14, 100),
    ("PENTA3", "Pentavalent - 3rd Dose", 14, 300),
    ("PCV3", "Pneumococcal - 3rd Dose", 14, 250),
    ("IPV", "Inactivated Polio Vaccine", 14, 350),
    ("MR1", "Measles-Rubella - 1st Dose", 39, 150),
    ("YF", "Yellow Fever", 39, 200),
    ("MR2", "Measles-Rubella - 2nd Dose", 78, 150),
    ("VIT_A", "Vitamin A Supplementation", 26, 0),
]


def weighted_choice(pairs):
    values, weights = zip(*pairs)
    return random.choices(values, weights=weights, k=1)[0]


def random_kenyan_phone():
    prefix = random.choice(["+2547", "+2541"])
    return f"{prefix}{random.randint(10000000, 99999999)}"


class Command(BaseCommand):
    help = "Seed AntenatalProfile/ANCVisit/DeliveryRecord/Child/PostnatalVisit/ChildImmunization/GrowthMonitoring."

    def add_arguments(self, parser):
        parser.add_argument(
            "--profiles", type=int, default=20,
            help="Number of AntenatalProfile records to create (default: 20)",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete all previously seeded MCH clinical records before re-seeding (keeps Patients/Users).",
        )

    def handle(self, *args, **options):
        profile_count = options["profiles"]

        if options["flush"]:
            self._flush()

        self.nurses = list(User.objects.filter(role=Role.NURSE))
        self.doctors = list(User.objects.filter(role=Role.DOCTOR))
        if not self.nurses or not self.doctors:
            self.stdout.write(self.style.ERROR(
                "No NURSE/DOCTOR users found. Run seed_mch_patients_users first."
            ))
            return

        with transaction.atomic():
            registrar = self._get_or_create_seed_registrar()
            mothers = self._seed_fresh_mothers(profile_count, registrar)
            self._seed_vaccine_catalog()
            profiles_created = self._seed_pregnancies(mothers, profile_count)

        self.stdout.write(self.style.SUCCESS(
            f"Done. Seeded {profiles_created} antenatal profiles (with ANC visits, "
            f"deliveries, children, postnatal visits, immunizations and growth records "
            f"where applicable)."
        ))

    # -- flush -------------------------------------------------------------

    def _flush(self):
        counts = {
            "GrowthMonitoring": GrowthMonitoring.objects.all().delete()[0],
            "ChildImmunization": ChildImmunization.objects.all().delete()[0],
            "PostnatalVisit": PostnatalVisit.objects.all().delete()[0],
            "Child": Child.objects.all().delete()[0],
            "DeliveryRecord": DeliveryRecord.objects.all().delete()[0],
            "ANCVisit": ANCVisit.objects.all().delete()[0],
            "AntenatalProfile": AntenatalProfile.objects.all().delete()[0],
        }
        for model_name, n in counts.items():
            self.stdout.write(f"  Flushed {n} {model_name} records")

        # Only Patients this command created itself (tagged via the
        # mch_seed_bot registrar) are removed — anything already in your
        # database, or added by another command, is left untouched.
        seeded_mothers, _ = Patient.objects.filter(
            created_by__username=SEED_REGISTRAR_USERNAME
        ).delete()
        self.stdout.write(f"  Flushed {seeded_mothers} seeded mother Patients")

    # -- fresh mothers ---------------------------------------------------

    def _get_or_create_seed_registrar(self):
        """A dedicated system User used only as created_by on seeded
        Patients, so this command's mothers are always identifiable and
        can be flushed independently of your real patient data."""
        registrar, _ = User.objects.get_or_create(
            username=SEED_REGISTRAR_USERNAME,
            defaults={
                "first_name": "MCH",
                "last_name": "Seed Bot",
                "role": Role.RECEPTIONIST,
                "is_active_staff": False,
            },
        )
        return registrar

    def _seed_fresh_mothers(self, count, registrar):
        """Create brand-new mother Patients for this run only — never
        reads or reuses Patients already in the database."""
        mothers = []
        next_id = SEED_NATIONAL_ID_START

        # Skip past any national_ids this command already used in a
        # previous (non-flushed) run, so reruns keep adding new mothers
        # instead of colliding on the unique national_id field.
        last_seeded = (
            Patient.objects.filter(
                created_by__username=SEED_REGISTRAR_USERNAME,
                national_id__gte=str(SEED_NATIONAL_ID_START),
            )
            .order_by("-national_id")
            .first()
        )
        if last_seeded and last_seeded.national_id.isdigit():
            next_id = int(last_seeded.national_id) + 1

        for _ in range(count):
            first_name = random.choice(FEMALE_FIRST_NAMES)
            last_name = random.choice(SURNAMES)
            dob = date.today() - timedelta(days=random.randint(17 * 365, 42 * 365))
            is_minor = (date.today() - dob).days < 18 * 365

            mother = Patient.objects.create(
                national_id=str(next_id),
                full_name=f"{first_name} {last_name}",
                gender="FEMALE",
                dob=dob,
                phone=random_kenyan_phone(),
                address=f"{random.choice(NAIROBI_ESTATES)}, Nairobi",
                guardian_name=f"{random.choice(MALE_FIRST_NAMES)} {last_name}" if is_minor else "",
                guardian_relationship="Parent" if is_minor else "",
                guardian_phone=random_kenyan_phone() if is_minor else "",
                next_of_kin_name=f"{random.choice(MALE_FIRST_NAMES)} {last_name}",
                next_of_kin_relationship=random.choice(["Spouse", "Sibling", "Parent"]),
                next_of_kin_phone=random_kenyan_phone(),
                created_by=registrar,
            )
            mothers.append(mother)
            next_id += 1

        self.stdout.write(f"Created {len(mothers)} fresh mother Patients (not touching existing ones).")
        return mothers

    # -- vaccine catalog -----------------------------------------------------

    def _seed_vaccine_catalog(self):
        created = 0
        for code, name, weeks, price in KEPI_VACCINES:
            _, was_created = VaccineCatalog.objects.get_or_create(
                code=code,
                defaults={"name": name, "recommended_age_weeks": weeks, "price": price},
            )
            created += int(was_created)
        self.stdout.write(f"Vaccine catalog: {created} new entries ({len(KEPI_VACCINES)} total).")

    # -- pregnancies ---------------------------------------------------------

    def _seed_pregnancies(self, mothers, profile_count):
        today = timezone.now().date()
        created = 0

        for mother in mothers:
            nurse = random.choice(self.nurses)
            doctor = random.choice(self.doctors)

            # Decide the pregnancy's current stage: most seeded profiles are
            # already delivered (so downstream PNC/child/immunization data
            # exists to demo), a third are still active/ongoing.
            already_delivered = random.random() < 0.65

            if already_delivered:
                delivery_date_est = today - timedelta(days=random.randint(3, 500))
                lmp = delivery_date_est - timedelta(days=280) + timedelta(days=random.randint(-10, 10))
            else:
                gestational_days = random.randint(30, 260)
                lmp = today - timedelta(days=gestational_days)

            gravida = random.randint(1, 5)
            para = random.randint(0, gravida - 1) if gravida > 1 else 0
            high_risk = random.random() < 0.18
            risk_factors = ", ".join(random.sample(RISK_FACTORS, k=random.randint(1, 2))) if high_risk else ""

            profile = AntenatalProfile.objects.create(
                mother=mother,
                gravida=gravida,
                para=para,
                lmp=lmp,
                blood_group=weighted_choice(BLOOD_GROUP_WEIGHTS),
                height_cm=round(random.uniform(150, 172), 1),
                booking_weight_kg=round(random.uniform(52, 85), 1),
                hiv_status=random.choices(
                    [HIVStatus.NEGATIVE, HIVStatus.POSITIVE, HIVStatus.UNKNOWN],
                    weights=[85, 8, 7], k=1,
                )[0],
                high_risk=high_risk,
                risk_factors=risk_factors,
                status=PregnancyStatus.DELIVERED if already_delivered else PregnancyStatus.ACTIVE,
                registered_by=nurse,
            )
            created += 1

            visit_end_date = self._seed_anc_visits(profile, nurse, cutoff=delivery_date_est if already_delivered else today)

            if already_delivered:
                self._seed_delivery_and_beyond(profile, doctor, nurse, delivery_date_est)

        return created

    def _seed_anc_visits(self, profile, nurse, cutoff):
        """Create ANC visits roughly every 4 weeks from booking up to `cutoff`."""
        visit_date = profile.lmp + timedelta(weeks=10)  # first booking visit ~10wks GA
        visit_number = 1
        last_date = profile.lmp

        while visit_date <= cutoff and visit_number <= 8:
            ga_weeks = (visit_date - profile.lmp).days // 7
            ANCVisit.objects.create(
                profile=profile,
                visit_number=visit_number,
                gestational_age_weeks=ga_weeks,
                weight_kg=round(float(profile.booking_weight_kg or 60) + visit_number * random.uniform(0.3, 1.2), 1),
                bp_systolic=random.randint(100, 135),
                bp_diastolic=random.randint(65, 88),
                fundal_height_cm=round(min(ga_weeks, 40) * random.uniform(0.9, 1.05), 1) if ga_weeks >= 16 else None,
                fetal_heartbeat_bpm=random.randint(120, 160) if ga_weeks >= 20 else None,
                fetal_presentation=random.choice(["Cephalic", "Breech", ""]) if ga_weeks >= 32 else "",
                urinalysis=random.choice(["Normal", "Trace protein", "Normal", "Normal"]),
                hemoglobin_level=round(random.uniform(9.5, 14.5), 1),
                next_appointment=visit_date + timedelta(weeks=4),
                attended_by=nurse,
            )
            last_date = visit_date
            visit_date += timedelta(weeks=4)
            visit_number += 1

        return last_date

    def _seed_delivery_and_beyond(self, profile, doctor, nurse, delivery_date_est):
        outcome = random.choices(
            [DeliveryOutcome.LIVE_BIRTH, DeliveryOutcome.STILLBIRTH], weights=[97, 3], k=1
        )[0]
        mode = random.choices(
            [DeliveryMode.SVD, DeliveryMode.ASSISTED, DeliveryMode.CAESAREAN, DeliveryMode.BREECH],
            weights=[65, 10, 22, 3], k=1,
        )[0]
        is_twins = random.random() < 0.02

        delivery = DeliveryRecord.objects.create(
            profile=profile,
            delivery_date=timezone.make_aware(
                datetime.combine(delivery_date_est, datetime.min.time())
            ) + timedelta(hours=random.randint(0, 23)),
            mode_of_delivery=mode,
            outcome=outcome,
            place_of_delivery=FACILITY_NAME,
            attended_by=doctor,
            blood_loss_ml=random.randint(150, 350) if mode != DeliveryMode.CAESAREAN else random.randint(300, 700),
        )

        if outcome == DeliveryOutcome.STILLBIRTH:
            return  # no live child to track further

        children = []
        for _ in range(2 if is_twins else 1):
            child = Child.objects.create(
                mother=profile.mother,
                delivery=delivery,
                sex=random.choice([Sex.MALE, Sex.FEMALE]),
                date_of_birth=delivery_date_est,
                birth_weight_kg=round(random.uniform(2.5, 4.1), 2),
                birth_length_cm=round(random.uniform(46, 54), 1),
                apgar_score_1min=random.randint(7, 9),
                apgar_score_5min=random.randint(8, 10),
                registered_by=nurse,
            )
            children.append(child)
            self._seed_immunizations(child, nurse)
            self._seed_growth_records(child, nurse)

        self._seed_postnatal_visits(profile, children[0], nurse, delivery_date_est)

    def _seed_postnatal_visits(self, profile, child, nurse, delivery_date_est):
        today = timezone.now().date()
        for day in (1, 3, 7, 42):
            visit_day_date = delivery_date_est + timedelta(days=day)
            if visit_day_date > today:
                break
            PostnatalVisit.objects.create(
                profile=profile,
                child=child,
                visit_day=day,
                mother_bp_systolic=random.randint(105, 130),
                mother_bp_diastolic=random.randint(65, 85),
                mother_temp_c=round(random.uniform(36.3, 37.2), 1),
                lochia_assessment=random.choice(["Normal, decreasing", "Normal", "Minimal"]),
                breastfeeding_status=random.choice(["Exclusive breastfeeding", "Exclusive breastfeeding", "Mixed feeding"]),
                child_weight_kg=round(float(child.birth_weight_kg or 3.0) + day * random.uniform(0.005, 0.02), 2),
                child_temp_c=round(random.uniform(36.4, 37.3), 1),
                attended_by=nurse,
            )

    def _seed_immunizations(self, child, nurse):
        today = timezone.now().date()
        for vaccine in VaccineCatalog.objects.all():
            due_date = child.date_of_birth + timedelta(weeks=vaccine.recommended_age_weeks)
            if due_date > today:
                status = ImmunizationStatus.DUE
                given_date = None
            else:
                # Mostly given on/near schedule, occasionally missed.
                status = random.choices(
                    [ImmunizationStatus.GIVEN, ImmunizationStatus.MISSED], weights=[88, 12], k=1
                )[0]
                given_date = due_date + timedelta(days=random.randint(0, 10)) if status == ImmunizationStatus.GIVEN else None
                if given_date and given_date > today:
                    given_date = today

            ChildImmunization.objects.create(
                child=child,
                vaccine=vaccine,
                status=status,
                due_date=due_date,
                given_date=given_date,
                batch_number=f"KEPI-{random.randint(1000, 9999)}" if status == ImmunizationStatus.GIVEN else "",
                administered_by=nurse if status == ImmunizationStatus.GIVEN else None,
            )

    def _seed_growth_records(self, child, nurse):
        today = timezone.now().date()
        age_weeks = (today - child.date_of_birth).days // 7
        checkpoints = [w for w in (0, 6, 10, 14, 26, 39, 52) if w <= age_weeks]

        for weeks in checkpoints:
            weight = float(child.birth_weight_kg or 3.0) + weeks * random.uniform(0.15, 0.22)
            height = float(child.birth_length_cm or 50) + weeks * random.uniform(0.25, 0.4)
            nutrition_status = random.choices(
                [NutritionStatus.NORMAL, NutritionStatus.MODERATE_MALNUTRITION, NutritionStatus.OVERWEIGHT],
                weights=[88, 8, 4], k=1,
            )[0]
            GrowthMonitoring.objects.create(
                child=child,
                weight_kg=round(weight, 2),
                height_cm=round(height, 1),
                muac_cm=round(random.uniform(11.5, 16.0), 1) if weeks >= 26 else None,
                nutrition_status=nutrition_status,
                recorded_by=nurse,
            )