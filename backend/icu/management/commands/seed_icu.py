"""
Management command: seed_icu

Seeds the ICU module with:
  - A set of ICUBed records (ICU + HDU, mix of ventilator-capable beds)
  - An ICUProcedureCatalog (central line, intubation, CPR, etc.)
  - 20 patients (created fresh in api.Patient if they don't already exist,
    matched on national_id)
  - An ICUAdmission per patient, some still active, some discharged /
    stepped down / deceased, with a plausible length of stay
  - A few ICUVitalsMonitoring readings and (where relevant) VentilatorSettings
    per admission
  - Daily ICUBedCharge rows rolled into a single Invoice per admission
    (source_type=INPATIENT), plus optional ICUProcedureRecord entries each
    with their own Invoice (source_type=PROCEDURE)
  - Payments against ~85% of invoices so you get a realistic mix of
    PAID / PARTIAL / UNPAID for testing

Usage:
    python manage.py seed_icu
    python manage.py seed_icu --patients 30
    python manage.py seed_icu --clear     # wipe previously seeded ICU data first

Re-running is safe: patients are matched on national_id, and a patient who
already has an ICU admission is skipped (no duplicate admissions are created
on repeat runs). Use --clear to start over.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    Patient,
    User,
    Role,
    Gender,
    Invoice,
    InvoiceSourceType,
    Payment,
    PaymentMethod,
)
from icu.models import (
    ICUBed,
    ICUBedStatus,
    ICUUnitType,
    ICUAdmission,
    AdmissionReason,
    ICUAdmissionStatus,
    ICUVitalsMonitoring,
    VentilatorSettings,
    VentilatorMode,
    ICUProcedureCatalog,
    ICUProcedureRecord,
    ICUBedCharge,
)


# ---------------------------------------------------------------------------
# Sample data — edit / extend freely
# ---------------------------------------------------------------------------
FIRST_NAMES_M = [
    "James", "Peter", "John", "Daniel", "Samuel", "David", "Joseph", "Kevin",
    "Brian", "Anthony", "Francis", "Michael", "Dennis", "Patrick", "George",
]
FIRST_NAMES_F = [
    "Susan", "Grace", "Mary", "Faith", "Esther", "Joyce", "Ann", "Caroline",
    "Beatrice", "Lucy", "Winnie", "Sarah", "Agnes", "Purity", "Diana",
]
LAST_NAMES = [
    "Mwangi", "Otieno", "Kariuki", "Njoroge", "Wanjiru", "Kamau", "Achieng",
    "Kiptoo", "Muthoni", "Ochieng", "Wafula", "Njeri", "Kimani", "Adhiambo",
    "Rono", "Wambui", "Omondi", "Chebet", "Mutua", "Nyambura",
]

BEDS = [
    {"bed_number": "ICU-01", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18000.00"), "has_ventilator": True},
    {"bed_number": "ICU-02", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18000.00"), "has_ventilator": True},
    {"bed_number": "ICU-03", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18000.00"), "has_ventilator": True},
    {"bed_number": "ICU-04", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18500.00"), "has_ventilator": True},
    {"bed_number": "ICU-05", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18500.00"), "has_ventilator": True},
    {"bed_number": "ICU-06", "unit_type": ICUUnitType.ICU, "daily_rate": Decimal("18500.00"), "has_ventilator": True},
    {"bed_number": "HDU-01", "unit_type": ICUUnitType.HDU, "daily_rate": Decimal("11000.00"), "has_ventilator": False},
    {"bed_number": "HDU-02", "unit_type": ICUUnitType.HDU, "daily_rate": Decimal("11000.00"), "has_ventilator": False},
    {"bed_number": "HDU-03", "unit_type": ICUUnitType.HDU, "daily_rate": Decimal("11500.00"), "has_ventilator": True},
    {"bed_number": "HDU-04", "unit_type": ICUUnitType.HDU, "daily_rate": Decimal("11500.00"), "has_ventilator": False},
]

PROCEDURES = [
    {"code": "ICP-001", "name": "Central Venous Line Insertion", "price": Decimal("8500.00")},
    {"code": "ICP-002", "name": "Arterial Line Insertion", "price": Decimal("6000.00")},
    {"code": "ICP-003", "name": "Endotracheal Intubation", "price": Decimal("9500.00")},
    {"code": "ICP-004", "name": "Cardiopulmonary Resuscitation (CPR)", "price": Decimal("7000.00")},
    {"code": "ICP-005", "name": "Chest Tube Insertion", "price": Decimal("12000.00")},
    {"code": "ICP-006", "name": "Hemodynamic Monitoring Setup", "price": Decimal("5500.00")},
    {"code": "ICP-007", "name": "Tracheostomy", "price": Decimal("22000.00")},
]

DIAGNOSES = {
    AdmissionReason.RESPIRATORY_FAILURE: [
        "Acute respiratory distress syndrome (ARDS)",
        "Severe community-acquired pneumonia with type 1 respiratory failure",
        "Acute exacerbation of COPD with hypercapnic respiratory failure",
    ],
    AdmissionReason.SEPSIS: [
        "Septic shock secondary to urosepsis",
        "Severe sepsis of abdominal origin, post-perforation",
        "Septic shock secondary to necrotizing fasciitis",
    ],
    AdmissionReason.POST_SURGICAL: [
        "Post-op monitoring following exploratory laparotomy",
        "Post-op monitoring following emergency C-section with PPH",
        "Post-op monitoring following major vascular surgery",
    ],
    AdmissionReason.TRAUMA: [
        "Polytrauma following road traffic accident, chest and pelvic injuries",
        "Severe traumatic brain injury following fall",
        "Blunt abdominal trauma with hemoperitoneum, post-laparotomy",
    ],
    AdmissionReason.CARDIAC: [
        "Acute STEMI complicated by cardiogenic shock",
        "Decompensated heart failure with pulmonary edema",
        "Post cardiac arrest care following successful resuscitation",
    ],
    AdmissionReason.NEUROLOGICAL: [
        "Hemorrhagic stroke with reduced GCS, ventilated",
        "Status epilepticus, post-ictal monitoring",
        "Guillain-Barre syndrome with respiratory compromise",
    ],
    AdmissionReason.OTHER: [
        "Severe diabetic ketoacidosis with altered mental status",
        "Acute pancreatitis with multi-organ dysfunction",
        "Severe electrolyte derangement under close monitoring",
    ],
}

DISCHARGE_SUMMARIES = [
    "Patient stabilized, weaned off support, stepped down to general ward for continued care.",
    "Patient improved clinically, extubated successfully, discharged home with follow-up.",
    "Family and care team elected transfer to referral facility for specialized care.",
    "Despite maximal supportive care, patient succumbed to illness; family counselled.",
]


class Command(BaseCommand):
    help = "Seed ICU beds, procedure catalog, patients, admissions, vitals and charges."

    def add_arguments(self, parser):
        parser.add_argument(
            "--patients",
            type=int,
            default=20,
            help="Number of patients to seed (default: 20).",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously seeded ICU admissions/beds/catalog before seeding.",
        )

    def handle(self, *args, **options):
        count = options["patients"]
        clear = options["clear"]

        if clear:
            self._clear()

        with transaction.atomic():
            beds = self._seed_beds()
            catalog = self._seed_procedure_catalog()
            physicians = list(User.objects.filter(role=Role.DOCTOR, is_active_staff=True))
            staff = physicians or list(User.objects.filter(is_active_staff=True)[:5])

            used_ids = set()
            for i in range(count):
                patient = self._get_or_create_patient(i, used_ids)
                if hasattr(patient, "icu_admissions") and patient.icu_admissions.exists():
                    self.stdout.write(f"  (skipping {patient.full_name} - already has an ICU admission)")
                    continue
                self._seed_admission(patient, beds, catalog, physicians, staff)

        self.stdout.write(self.style.SUCCESS("ICU seed data created successfully."))

    # ------------------------------------------------------------------
    def _clear(self):
        self.stdout.write("Clearing existing ICU admissions, beds and procedure catalog...")
        ICUAdmission.objects.all().delete()
        ICUBed.objects.all().delete()
        ICUProcedureCatalog.objects.all().delete()

    def _seed_beds(self):
        beds = []
        for b in BEDS:
            bed, created = ICUBed.objects.get_or_create(
                bed_number=b["bed_number"],
                defaults={
                    "unit_type": b["unit_type"],
                    "daily_rate": b["daily_rate"],
                    "has_ventilator": b["has_ventilator"],
                    "status": ICUBedStatus.AVAILABLE,
                    "is_active": True,
                },
            )
            beds.append(bed)
            if created:
                self.stdout.write(f"  + bed {bed.bed_number}")
        return beds

    def _seed_procedure_catalog(self):
        catalog = []
        for p in PROCEDURES:
            proc, created = ICUProcedureCatalog.objects.get_or_create(
                code=p["code"],
                defaults={"name": p["name"], "price": p["price"], "is_active": True},
            )
            catalog.append(proc)
            if created:
                self.stdout.write(f"  + procedure {proc.code} {proc.name}")
        return catalog

    def _get_or_create_patient(self, index, used_ids):
        gender = random.choice([Gender.MALE, Gender.FEMALE])
        first = random.choice(FIRST_NAMES_M if gender == Gender.MALE else FIRST_NAMES_F)
        last = random.choice(LAST_NAMES)
        full_name = f"{first} {last}"

        national_id = str(90000000 + index)
        while national_id in used_ids:
            national_id = str(90000000 + random.randint(index, index + 10000))
        used_ids.add(national_id)

        age_years = random.randint(19, 82)
        dob = (timezone.now() - timedelta(days=age_years * 365 + random.randint(0, 364))).date()

        patient, created = Patient.objects.get_or_create(
            national_id=national_id,
            defaults={
                "full_name": full_name,
                "gender": gender,
                "dob": dob,
                "phone": f"07{random.randint(10000000, 99999999)}",
                "address": random.choice(["Nairobi", "Kiambu", "Machakos", "Kajiado", "Nakuru"]),
                "next_of_kin_name": f"{random.choice(FIRST_NAMES_M + FIRST_NAMES_F)} {last}",
                "next_of_kin_phone": f"07{random.randint(10000000, 99999999)}",
                "next_of_kin_relationship": random.choice(["Spouse", "Sibling", "Parent", "Child"]),
            },
        )
        if created:
            self.stdout.write(f"  + patient {patient.full_name} ({patient.hospital_number})")
        return patient

    def _seed_admission(self, patient, beds, catalog, physicians, staff):
        bed = random.choice(beds)
        reason = random.choice(list(AdmissionReason.values))
        diagnosis = random.choice(DIAGNOSES[reason])
        physician = random.choice(physicians) if physicians else None
        admitted_by = random.choice(staff) if staff else None

        # ~65% of seeded admissions are historical/discharged, ~35% still active
        is_discharged = random.random() < 0.65
        days_ago_start = random.randint(1, 30)
        los_days = random.randint(1, min(days_ago_start, 14))

        admission = ICUAdmission.objects.create(
            patient=patient,
            bed=bed,
            admission_reason=reason,
            admission_diagnosis=diagnosis,
            severity_score=random.randint(8, 35),
            attending_physician=physician,
            admitted_by=admitted_by,
            status=ICUAdmissionStatus.ADMITTED,
        )

        admitted_at = timezone.now() - timedelta(days=days_ago_start)
        discharged_at = None
        discharge_summary = ""
        status = ICUAdmissionStatus.ADMITTED

        if is_discharged:
            discharged_at = admitted_at + timedelta(days=los_days)
            status = random.choices(
                [
                    ICUAdmissionStatus.STEPPED_DOWN,
                    ICUAdmissionStatus.DISCHARGED_HOME,
                    ICUAdmissionStatus.TRANSFERRED_OUT,
                    ICUAdmissionStatus.DECEASED,
                ],
                weights=[45, 30, 15, 10],
            )[0]
            discharge_summary = random.choice(DISCHARGE_SUMMARIES)

        # admitted_at is auto_now_add — bypass via queryset.update() so we can
        # backdate it, then set the remaining fields normally.
        ICUAdmission.objects.filter(pk=admission.pk).update(admitted_at=admitted_at)
        admission.status = status
        admission.discharged_at = discharged_at
        admission.discharge_summary = discharge_summary
        admission.save(update_fields=["status", "discharged_at", "discharge_summary"])
        admission.admitted_at = admitted_at  # keep in-memory instance consistent

        num_charge_days = los_days if is_discharged else max((timezone.now() - admitted_at).days, 1)
        self._seed_bed_charges(admission, bed, admitted_at, num_charge_days)
        self._seed_vitals(admission, num_charge_days)
        if bed.has_ventilator and (reason == AdmissionReason.RESPIRATORY_FAILURE or random.random() < 0.3):
            self._seed_ventilator_settings(admission)
        self._seed_procedures(admission, catalog, admitted_by or physician)

        self.stdout.write(f"    + ICU admission {admission.icu_admission_number} ({status}) for {patient.full_name}")

    def _seed_bed_charges(self, admission, bed, admitted_at, num_days):
        total = bed.daily_rate * num_days
        invoice = Invoice.objects.create(
            patient=admission.patient,
            source_type=InvoiceSourceType.INPATIENT,
            description=f"ICU/HDU bed charges - {admission.icu_admission_number} ({bed.bed_number})",
            amount=total,
        )
        for day in range(num_days):
            ICUBedCharge.objects.get_or_create(
                icu_admission=admission,
                charge_date=(admitted_at + timedelta(days=day)).date(),
                defaults={"bed": bed, "amount": bed.daily_rate, "invoice": invoice},
            )
        self._maybe_pay(invoice)

    def _seed_vitals(self, admission, num_days):
        readings_per_day = 2
        total_readings = max(num_days * readings_per_day, 2)
        for _ in range(min(total_readings, 12)):
            ICUVitalsMonitoring.objects.create(
                icu_admission=admission,
                heart_rate=random.randint(60, 130),
                bp_systolic=random.randint(85, 150),
                bp_diastolic=random.randint(50, 95),
                mean_arterial_pressure=random.randint(60, 100),
                respiratory_rate=random.randint(14, 32),
                oxygen_saturation=random.randint(88, 100),
                temperature_c=Decimal(str(round(random.uniform(36.0, 39.5), 1))),
                gcs_score=random.randint(6, 15),
                urine_output_ml=random.randint(20, 120),
                central_venous_pressure=random.randint(4, 14),
                notes=random.choice(["", "Stable trend.", "Deteriorating trend, team notified.", "Improving."]),
                recorded_by=admission.admitted_by,
            )

    def _seed_ventilator_settings(self, admission):
        for _ in range(random.randint(1, 3)):
            VentilatorSettings.objects.create(
                icu_admission=admission,
                mode=random.choice([VentilatorMode.AC, VentilatorMode.SIMV, VentilatorMode.PSV, VentilatorMode.BIPAP]),
                fio2_percent=random.choice([30, 40, 50, 60, 80, 100]),
                peep_cmh2o=Decimal(str(random.choice([5.0, 6.0, 8.0, 10.0]))),
                tidal_volume_ml=random.randint(350, 550),
                respiratory_rate_set=random.randint(12, 22),
                peak_pressure=random.randint(18, 32),
                notes="",
                recorded_by=admission.attending_physician,
            )

    def _seed_procedures(self, admission, catalog, performer):
        for proc in random.sample(catalog, k=random.randint(0, 3)):
            invoice = Invoice.objects.create(
                patient=admission.patient,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"{proc.name} - {admission.icu_admission_number}",
                amount=proc.price,
            )
            ICUProcedureRecord.objects.create(
                icu_admission=admission,
                procedure=proc,
                performed_by=performer,
                notes="",
                invoice=invoice,
            )
            self._maybe_pay(invoice)

    def _maybe_pay(self, invoice, probability=0.85):
        if random.random() < probability:
            Payment.objects.create(
                invoice=invoice,
                amount=invoice.amount,
                method=random.choice([PaymentMethod.CASH, PaymentMethod.MPESA, PaymentMethod.INSURANCE]),
            )
            invoice.amount_paid = invoice.amount
            invoice.recalculate_status()