"""
Seed command for the Emergency Department module.

Creates (if missing) a pool of Kenyan patients via the `api` app, plus a
full set of ED data: bays, visits, triage vitals, notes, procedure
catalog + orders, medication orders/administrations (if a Medicine model
with usable fields exists), and bay charges for disposed visits.

Usage:
    python manage.py seed_emergency
    python manage.py seed_emergency --patients 40 --visits 60
    python manage.py seed_emergency --flush        # wipe previously seeded ED data first
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import User, Patient, Role, Gender

from emergency.models import (
    EmergencyBay, BayZone, BayStatus,
    EmergencyVisit, TriageLevel, ArrivalMode, EmergencyStatus,
    TriageVitals, EmergencyNote,
    EmergencyProcedureCatalog, EmergencyProcedure, EmergencyProcedureStatus,
    EmergencyMedicationRoute, EmergencyMedicationOrder,
    EmergencyAdministrationStatus, EmergencyMedicationAdministration,
    EmergencyBayCharge,
)

try:
    from api.models import Medicine, MedicineBatch
    HAS_MEDICINE_MODEL = True
except ImportError:
    HAS_MEDICINE_MODEL = False


FIRST_NAMES_M = [
    "Brian", "Kevin", "Dennis", "Peter", "John", "James", "Samuel", "Victor",
    "Elvis", "Erick", "Felix", "George", "Ibrahim", "Joseph", "Kelvin",
    "Moses", "Nicholas", "Patrick", "Stephen", "Vincent",
]
FIRST_NAMES_F = [
    "Faith", "Mercy", "Grace", "Joyce", "Winnie", "Esther", "Purity",
    "Caroline", "Diana", "Eunice", "Irene", "Josephine", "Lilian",
    "Millicent", "Naomi", "Rose", "Sharon", "Teresia", "Ann", "Beatrice",
]
LAST_NAMES = [
    "Mwangi", "Otieno", "Wanjiru", "Kamau", "Achieng", "Njoroge", "Odhiambo",
    "Kariuki", "Wafula", "Muthoni", "Kiptoo", "Chebet", "Omondi", "Nyambura",
    "Barasa", "Cherono", "Mutiso", "Kilonzo", "Waweru", "Adhiambo",
]

CHIEF_COMPLAINTS = [
    "Road traffic accident with chest trauma",
    "Severe abdominal pain, suspected appendicitis",
    "High-grade fever with chills, ?malaria",
    "Difficulty breathing, known asthmatic",
    "Deep cut on left forearm from panga injury",
    "Chest pain radiating to left arm",
    "Fall from boda boda, head injury",
    "Convulsions, first episode",
    "Severe headache with blurred vision",
    "Suspected poisoning, ingested unknown substance",
    "Burns from cooking gas explosion",
    "Postpartum hemorrhage",
    "Snake bite to right leg",
    "Acute allergic reaction, facial swelling",
    "Gunshot wound, thigh",
    "Severe dehydration and vomiting",
    "Assault victim, multiple lacerations",
    "Suspected stroke, sudden left-sided weakness",
    "Diabetic emergency, altered consciousness",
    "Drowning, near-fatal, resuscitated on scene",
]

DISPOSITION_NOTES = [
    "Stabilized and discharged home with outpatient follow-up.",
    "Admitted to Medical Ward for further management.",
    "Referred to Kenyatta National Hospital for specialist care.",
    "Discharged against medical advice after counselling.",
    "Admitted to ICU for close monitoring.",
    "Wound sutured, tetanus toxoid given, discharged.",
    "Transferred to Surgical Ward for pre-op workup.",
]

PROCEDURE_CATALOG_SEED = [
    ("EDPX001", "Wound Suturing", Decimal("1500.00")),
    ("EDPX002", "X-Ray (Limb)", Decimal("2500.00")),
    ("EDPX003", "ECG", Decimal("1000.00")),
    ("EDPX004", "IV Cannulation", Decimal("500.00")),
    ("EDPX005", "Nebulization", Decimal("800.00")),
    ("EDPX006", "Splinting/Casting", Decimal("2000.00")),
    ("EDPX007", "Blood Transfusion Setup", Decimal("3000.00")),
    ("EDPX008", "Foley Catheterization", Decimal("1200.00")),
    ("EDPX009", "Lumbar Puncture", Decimal("4000.00")),
    ("EDPX010", "CPR / Resuscitation", Decimal("0.00")),
]

BAY_SEED = [
    ("T1", BayZone.TRIAGE, Decimal("0.00")),
    ("T2", BayZone.TRIAGE, Decimal("0.00")),
    ("R1", BayZone.RESUSCITATION, Decimal("2500.00")),
    ("R2", BayZone.RESUSCITATION, Decimal("2500.00")),
    ("G1", BayZone.GENERAL, Decimal("800.00")),
    ("G2", BayZone.GENERAL, Decimal("800.00")),
    ("G3", BayZone.GENERAL, Decimal("800.00")),
    ("G4", BayZone.GENERAL, Decimal("800.00")),
    ("O1", BayZone.OBSERVATION, Decimal("1200.00")),
    ("O2", BayZone.OBSERVATION, Decimal("1200.00")),
]


class Command(BaseCommand):
    help = "Seed Emergency Department demo data (bays, visits, vitals, procedures, meds, charges)."

    def add_arguments(self, parser):
        parser.add_argument("--patients", type=int, default=25, help="Minimum number of patients to have available")
        parser.add_argument("--visits", type=int, default=40, help="Number of emergency visits to create")
        parser.add_argument("--flush", action="store_true", help="Delete existing ED-seeded data before seeding")

    def handle(self, *args, **options):
        num_patients = options["patients"]
        num_visits = options["visits"]

        if options["flush"]:
            self._flush()

        with transaction.atomic():
            doctors = self._get_or_create_staff(Role.DOCTOR, 6)
            nurses = self._get_or_create_staff(Role.NURSE, 6)
            registrars = nurses + doctors

            patients = self._get_or_create_patients(num_patients)
            bays = self._seed_bays()
            catalog = self._seed_procedure_catalog()

            medicines = list(Medicine.objects.all()[:15]) if HAS_MEDICINE_MODEL else []

            visits_created = 0
            for _ in range(num_visits):
                visit = self._create_visit(patients, bays, doctors, registrars)
                self._create_vitals(visit, nurses)
                self._maybe_create_notes(visit, doctors + nurses)
                self._maybe_create_procedures(visit, catalog, doctors, nurses)
                if medicines:
                    self._maybe_create_medication(visit, medicines, doctors, nurses)
                self._maybe_create_bay_charge(visit)
                visits_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {visits_created} emergency visits across {len(patients)} patients "
            f"and {len(bays)} bays."
        ))
        if not HAS_MEDICINE_MODEL or not medicines:
            self.stdout.write(self.style.WARNING(
                "No usable Medicine records found — skipped medication orders/administrations. "
                "Seed the pharmacy/medicine data first if you need those populated."
            ))

    # ------------------------------------------------------------------
    # Flush
    # ------------------------------------------------------------------
    def _flush(self):
        EmergencyBayCharge.objects.all().delete()
        EmergencyMedicationAdministration.objects.all().delete()
        EmergencyMedicationOrder.objects.all().delete()
        EmergencyProcedure.objects.all().delete()
        EmergencyNote.objects.all().delete()
        TriageVitals.objects.all().delete()
        EmergencyVisit.objects.all().delete()
        EmergencyBay.objects.all().delete()
        EmergencyProcedureCatalog.objects.all().delete()
        self.stdout.write(self.style.WARNING("Flushed existing emergency module data."))

    # ------------------------------------------------------------------
    # Staff
    # ------------------------------------------------------------------
    def _get_or_create_staff(self, role, minimum):
        existing = list(User.objects.filter(role=role, is_active_staff=True))
        if len(existing) >= minimum:
            return existing

        needed = minimum - len(existing)
        role_label = role.label.replace(" ", "").lower()
        for i in range(needed):
            idx = len(existing) + i + 1
            first = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
            last = random.choice(LAST_NAMES)
            username = f"{role_label}{idx}"
            user = User.objects.create_user(
                username=username,
                email=f"{username}@southb.hospital.ke",
                password="ChangeMe123!",
                first_name=first,
                last_name=last,
                role=role,
                phone=f"+2547{random.randint(10000000, 99999999)}",
                is_active_staff=True,
            )
            existing.append(user)
        return existing

    # ------------------------------------------------------------------
    # Patients (api module)
    # ------------------------------------------------------------------
    def _get_or_create_patients(self, minimum):
        existing = list(Patient.objects.all())
        if len(existing) >= minimum:
            return existing

        needed = minimum - len(existing)
        creator = User.objects.filter(is_active_staff=True).first()

        for _ in range(needed):
            gender = random.choice([Gender.MALE, Gender.FEMALE])
            first = random.choice(FIRST_NAMES_M if gender == Gender.MALE else FIRST_NAMES_F)
            last = random.choice(LAST_NAMES)
            is_minor = random.random() < 0.15

            dob = timezone.now().date() - timedelta(
                days=random.randint(365 * 1, 365 * 12) if is_minor else random.randint(365 * 18, 365 * 80)
            )

            patient = Patient(
                full_name=f"{first} {last}",
                gender=gender,
                dob=dob,
                phone=f"+2547{random.randint(10000000, 99999999)}" if not is_minor else "",
                address=random.choice([
                    "South B, Nairobi", "Langata, Nairobi", "Imara Daima, Nairobi",
                    "Nyayo Estate, Nairobi", "Madaraka, Nairobi", "Mukuru kwa Njenga, Nairobi",
                    "Industrial Area, Nairobi", "Otiende, Nairobi",
                ]),
                national_id=str(random.randint(20000000, 45000000)) if not is_minor else None,
                created_by=creator,
            )
            if is_minor:
                g_first = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
                patient.guardian_name = f"{g_first} {last}"
                patient.guardian_phone = f"+2547{random.randint(10000000, 99999999)}"
                patient.guardian_relationship = random.choice(["Mother", "Father", "Guardian"])
            else:
                nok_first = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
                patient.next_of_kin_name = f"{nok_first} {random.choice(LAST_NAMES)}"
                patient.next_of_kin_phone = f"+2547{random.randint(10000000, 99999999)}"
                patient.next_of_kin_relationship = random.choice(["Spouse", "Sibling", "Parent", "Child", "Friend"])

            patient.save()
            existing.append(patient)

        return existing

    # ------------------------------------------------------------------
    # Bays / catalog
    # ------------------------------------------------------------------
    def _seed_bays(self):
        bays = []
        for bay_number, zone, rate in BAY_SEED:
            bay, _ = EmergencyBay.objects.get_or_create(
                bay_number=bay_number,
                defaults={"zone": zone, "hourly_rate": rate, "status": BayStatus.AVAILABLE, "is_active": True},
            )
            bays.append(bay)
        return bays

    def _seed_procedure_catalog(self):
        catalog = []
        for code, name, price in PROCEDURE_CATALOG_SEED:
            proc, _ = EmergencyProcedureCatalog.objects.get_or_create(
                code=code, defaults={"name": name, "price": price, "is_active": True}
            )
            catalog.append(proc)
        return catalog

    # ------------------------------------------------------------------
    # Visits
    # ------------------------------------------------------------------
    def _create_visit(self, patients, bays, doctors, registrars):
        patient = random.choice(patients)
        triage_level = random.choices(
            list(TriageLevel.values),
            weights=[3, 12, 40, 30, 15],  # skew toward Urgent / Less Urgent
            k=1,
        )[0]
        arrival_mode = random.choices(
            list(ArrivalMode.values), weights=[55, 25, 5, 10, 5], k=1
        )[0]

        arrived_days_ago = random.randint(0, 21)
        arrived_at = timezone.now() - timedelta(
            days=arrived_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59)
        )

        is_disposed = random.random() < 0.75
        status = EmergencyStatus.IN_ED
        disposition_at = None
        disposition_notes = ""
        bay = random.choice(bays) if random.random() < 0.85 else None

        if is_disposed:
            status = random.choices(
                [
                    EmergencyStatus.DISCHARGED,
                    EmergencyStatus.ADMITTED,
                    EmergencyStatus.TRANSFERRED_OUT,
                    EmergencyStatus.LAMA,
                    EmergencyStatus.DECEASED,
                ],
                weights=[55, 30, 8, 5, 2],
                k=1,
            )[0]
            disposition_at = arrived_at + timedelta(
                hours=random.uniform(0.5, 14),
            )
            disposition_notes = random.choice(DISPOSITION_NOTES)
            if bay:
                bay.status = BayStatus.CLEANING
                bay.save(update_fields=["status"])
        elif bay:
            bay.status = BayStatus.OCCUPIED
            bay.save(update_fields=["status"])

        visit = EmergencyVisit(
            patient=patient,
            bay=bay,
            triage_level=triage_level,
            arrival_mode=arrival_mode,
            chief_complaint=random.choice(CHIEF_COMPLAINTS),
            attending_doctor=random.choice(doctors),
            registered_by=random.choice(registrars),
            status=status,
            disposition_at=disposition_at,
            disposition_notes=disposition_notes,
        )
        visit.save()
        # arrived_at has auto_now_add=True so it must be backdated with a direct update
        EmergencyVisit.objects.filter(pk=visit.pk).update(arrived_at=arrived_at)
        visit.refresh_from_db()
        return visit

    def _create_vitals(self, visit, nurses):
        TriageVitals.objects.create(
            emergency_visit=visit,
            weight_kg=Decimal(random.randint(40, 95)),
            temperature_c=Decimal(f"{random.uniform(36.0, 40.0):.1f}"),
            pulse_bpm=random.randint(55, 140),
            respiratory_rate=random.randint(12, 32),
            bp_systolic=random.randint(90, 170),
            bp_diastolic=random.randint(55, 105),
            oxygen_saturation=random.randint(85, 100),
            gcs_score=random.choice([15, 15, 15, 14, 13, 10, 8, 3]),
            pain_score=random.randint(0, 10),
            recorded_by=random.choice(nurses),
        )

    def _maybe_create_notes(self, visit, staff):
        for _ in range(random.randint(0, 3)):
            EmergencyNote.objects.create(
                emergency_visit=visit,
                author=random.choice(staff),
                note=random.choice([
                    "Patient responding well to treatment.",
                    "Family updated on condition and plan of care.",
                    "Repeat vitals stable, continue monitoring.",
                    "Consult requested from Surgery.",
                    "Patient anxious, reassurance given.",
                    "Awaiting lab results before disposition decision.",
                ]),
            )

    def _maybe_create_procedures(self, visit, catalog, doctors, nurses):
        for _ in range(random.randint(0, 2)):
            proc = random.choice(catalog)
            status = random.choices(
                list(EmergencyProcedureStatus.values), weights=[15, 75, 10], k=1
            )[0]
            EmergencyProcedure.objects.create(
                emergency_visit=visit,
                procedure=proc,
                status=status,
                ordered_by=random.choice(doctors),
                performed_by=random.choice(nurses) if status == EmergencyProcedureStatus.COMPLETED else None,
                completed_at=timezone.now() if status == EmergencyProcedureStatus.COMPLETED else None,
            )

    def _maybe_create_medication(self, visit, medicines, doctors, nurses):
        if random.random() < 0.4:
            return
        medicine = random.choice(medicines)
        order = EmergencyMedicationOrder.objects.create(
            emergency_visit=visit,
            medicine=medicine,
            dosage=random.choice(["500mg", "1g", "250mg", "10mg", "2mg/kg", "5ml"]),
            route=random.choice(list(EmergencyMedicationRoute.values)),
            quantity=random.randint(1, 3),
            ordered_by=random.choice(doctors),
        )
        if random.random() < 0.8:
            EmergencyMedicationAdministration.objects.create(
                medication_order=order,
                administered_by=random.choice(nurses),
                status=random.choices(
                    list(EmergencyAdministrationStatus.values), weights=[85, 8, 7], k=1
                )[0],
            )

    def _maybe_create_bay_charge(self, visit):
        if not visit.bay or not visit.disposition_at:
            return
        hours = Decimal(str(round(visit.duration_hours, 2)))
        amount = (hours * visit.bay.hourly_rate).quantize(Decimal("0.01"))
        EmergencyBayCharge.objects.create(
            emergency_visit=visit,
            bay=visit.bay,
            hours_charged=hours,
            amount=amount,
        )