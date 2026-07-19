"""
Seed realistic data for the ambulance app.

Reuses existing api.models.User rows for crew/staff assignments (does NOT
create new users). Unlike Department/Supplier/Medicine in other seeders,
Patient and Invoice ARE created here — ambulance dispatch is exactly the
kind of workflow that legitimately creates new patients (unknown emergency
pickups) and new invoices (billing for the trip), so that's the intended
behavior, not a shortcut.

Roughly 70% of dispatches attach to a patient (a mix of existing Patient
rows if any exist, and freshly created ones), the rest use
patient_name_freetext to model an unregistered/unknown emergency pickup.
Completed dispatches get an Invoice (source_type=EMERGENCY) computed from
the ambulance's base_fee + distance_km * rate_per_km, and most of those
invoices get at least one Payment.

If no User rows exist, the command aborts and tells you to seed users first.

Usage:
    python manage.py seed_ambulance
    python manage.py seed_ambulance --ambulances 8 --dispatches 40
    python manage.py seed_ambulance --clear   # wipes ambulance app data first
                                               # (Patients/Invoices it created
                                               #  are left alone — see note below)

Place this file at: ambulance/management/commands/seed_ambulance.py
(create empty __init__.py files in ambulance/management/ and
ambulance/management/commands/ if they don't already exist)
"""

import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    Gender,
    Invoice,
    InvoiceSourceType,
    Patient,
    Payment,
    PaymentMethod,
    User,
)
from ambulance.models import (
    Ambulance,
    AmbulanceCrewMember,
    AmbulanceMaintenanceLog,
    AmbulanceMaintenanceType,
    AmbulanceStatus,
    AmbulanceType,
    AmbulanceDispatch,
    CrewRole,
    DispatchCrewMember,
    DispatchStatus,
    DispatchType,
)

FIRST_NAMES_M = [
    "Brian", "Kevin", "Dennis", "Peter", "James", "John", "Samuel", "Kelvin",
    "Victor", "Erick", "Collins", "Felix", "George", "Anthony", "Moses",
]
FIRST_NAMES_F = [
    "Faith", "Mercy", "Grace", "Joyce", "Esther", "Purity", "Winnie", "Ann",
    "Caroline", "Diana", "Brenda", "Lilian", "Sharon", "Beatrice", "Alice",
]
LAST_NAMES = [
    "Otieno", "Kariuki", "Mwangi", "Njoroge", "Wanjiru", "Kiptoo", "Cheruiyot",
    "Achieng", "Odhiambo", "Kamau", "Wafula", "Barasa", "Mutua", "Njeri",
    "Waweru", "Korir", "Chebet", "Muthoni", "Onyango", "Simiyu",
]

LOCATIONS = [
    "Westlands, Nairobi", "CBD, Nairobi", "Kasarani, Nairobi", "Kilimani, Nairobi",
    "Embakasi, Nairobi", "Ngong Road, Nairobi", "Thika Road, Nairobi",
    "Lang'ata, Nairobi", "Ruaka, Nairobi", "Rongai, Nairobi", "Kikuyu, Kiambu",
    "Athi River, Machakos", "Ruiru, Kiambu",
]

AMBULANCE_MAKES = [
    "Toyota Land Cruiser", "Nissan Urvan", "Toyota Hiace", "Mercedes Sprinter",
    "Ford Transit", "Isuzu D-Max",
]

MAINTENANCE_DESCRIPTIONS = {
    AmbulanceMaintenanceType.SERVICE: [
        "Routine oil change and filter replacement.",
        "Scheduled service — brakes, fluids, and general check.",
    ],
    AmbulanceMaintenanceType.REPAIR: [
        "Replaced worn brake pads.",
        "Fixed air conditioning unit.",
        "Repaired suspension after rough road use.",
    ],
    AmbulanceMaintenanceType.INSPECTION: [
        "Annual roadworthiness inspection.",
        "Post-incident safety inspection.",
    ],
}


def random_full_name():
    if random.random() < 0.5:
        first = random.choice(FIRST_NAMES_M)
        gender = Gender.MALE
    else:
        first = random.choice(FIRST_NAMES_F)
        gender = Gender.FEMALE
    last = random.choice(LAST_NAMES)
    return f"{first} {last}", gender


def random_phone():
    return f"07{random.randint(10000000, 99999999)}"


def random_national_id():
    return str(random.randint(20000000, 39999999))


class Command(BaseCommand):
    help = (
        "Seed ambulance app data (fleet, crew, dispatches, maintenance). Creates "
        "Patient/Invoice/Payment rows as needed; reuses existing Users."
    )

    def add_arguments(self, parser):
        parser.add_argument("--ambulances", type=int, default=6, help="Number of ambulances to create.")
        parser.add_argument("--dispatches", type=int, default=35, help="Number of dispatch records to create.")
        parser.add_argument("--clear", action="store_true", help="Delete existing ambulance app rows before seeding.")

    def handle(self, *args, **options):
        num_ambulances = options["ambulances"]
        num_dispatches = options["dispatches"]
        clear = options["clear"]

        users = list(User.objects.all())
        if not users:
            self.stderr.write(self.style.ERROR(
                "No User rows found. Seed api/User data first — this command reuses "
                "existing users for crew and staff assignments."
            ))
            return

        with transaction.atomic():
            if clear:
                self._clear()

            ambulances = self._seed_ambulances(num_ambulances)
            self._seed_crew_members(ambulances, users)
            self._seed_maintenance_logs(ambulances, users)
            dispatches = self._seed_dispatches(num_dispatches, ambulances, users)
            self._seed_dispatch_crew(dispatches, ambulances, users)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(ambulances)} ambulances and {len(dispatches)} dispatches."
        ))

    # ------------------------------------------------------------------
    def _clear(self):
        DispatchCrewMember.objects.all().delete()
        AmbulanceDispatch.objects.all().delete()
        AmbulanceMaintenanceLog.objects.all().delete()
        AmbulanceCrewMember.objects.all().delete()
        Ambulance.objects.all().delete()
        self.stdout.write(
            "Cleared existing ambulance app data. Patients/Invoices/Payments created "
            "by earlier runs were left in place — clean those up separately if needed."
        )

    # ------------------------------------------------------------------
    def _seed_ambulances(self, num_ambulances):
        ambulances = []
        for i in range(num_ambulances):
            ambulance_type = random.choices(
                [AmbulanceType.BASIC, AmbulanceType.ADVANCED,
                 AmbulanceType.NEONATAL, AmbulanceType.PATIENT_TRANSPORT],
                weights=[40, 30, 10, 20],
            )[0]
            status = random.choices(
                [AmbulanceStatus.AVAILABLE, AmbulanceStatus.ON_CALL,
                 AmbulanceStatus.UNDER_MAINTENANCE, AmbulanceStatus.OUT_OF_SERVICE],
                weights=[60, 20, 12, 8],
            )[0]
            base_fee = {
                AmbulanceType.BASIC: Decimal("2000"),
                AmbulanceType.ADVANCED: Decimal("4500"),
                AmbulanceType.NEONATAL: Decimal("6000"),
                AmbulanceType.PATIENT_TRANSPORT: Decimal("1500"),
            }[ambulance_type]
            rate_per_km = {
                AmbulanceType.BASIC: Decimal("100"),
                AmbulanceType.ADVANCED: Decimal("150"),
                AmbulanceType.NEONATAL: Decimal("180"),
                AmbulanceType.PATIENT_TRANSPORT: Decimal("80"),
            }[ambulance_type]

            ambulance = Ambulance.objects.create(
                registration_number=f"K{random.choice('ABCDE')}{random.randint(100, 999)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}",
                ambulance_type=ambulance_type,
                make_model=random.choice(AMBULANCE_MAKES),
                capacity=1 if ambulance_type != AmbulanceType.PATIENT_TRANSPORT else random.choice([1, 2]),
                base_fee=base_fee,
                rate_per_km=rate_per_km,
                status=status,
                current_location=random.choice(LOCATIONS),
            )
            ambulances.append(ambulance)
        return ambulances

    # ------------------------------------------------------------------
    def _seed_crew_members(self, ambulances, users):
        for ambulance in ambulances:
            crew_size = random.randint(2, 3)
            chosen_users = random.sample(users, min(crew_size, len(users)))
            roles_cycle = [CrewRole.DRIVER, CrewRole.PARAMEDIC, CrewRole.NURSE]
            for idx, user in enumerate(chosen_users):
                AmbulanceCrewMember.objects.get_or_create(
                    ambulance=ambulance,
                    user=user,
                    role=roles_cycle[idx % len(roles_cycle)],
                )

    # ------------------------------------------------------------------
    def _seed_maintenance_logs(self, ambulances, users):
        for ambulance in ambulances:
            for _ in range(random.randint(1, 4)):
                maintenance_type = random.choices(
                    [AmbulanceMaintenanceType.SERVICE, AmbulanceMaintenanceType.REPAIR,
                     AmbulanceMaintenanceType.INSPECTION],
                    weights=[50, 30, 20],
                )[0]
                AmbulanceMaintenanceLog.objects.create(
                    ambulance=ambulance,
                    maintenance_type=maintenance_type,
                    service_date=date.today() - timedelta(days=random.randint(1, 500)),
                    odometer_reading=random.randint(10000, 180000),
                    vendor=random.choice(["CMC Motors", "Toyota Kenya", "Simba Corp", "Local Garage"]),
                    cost=Decimal(random.choice([3500, 5000, 8000, 12000, 25000])),
                    description=random.choice(MAINTENANCE_DESCRIPTIONS[maintenance_type]),
                    logged_by=random.choice(users),
                )

    # ------------------------------------------------------------------
    def _seed_dispatches(self, num_dispatches, ambulances, users):
        existing_patients = list(Patient.objects.all())
        dispatches = []

        status_pool = [
            DispatchStatus.REQUESTED, DispatchStatus.DISPATCHED,
            DispatchStatus.PATIENT_ONBOARD, DispatchStatus.COMPLETED,
            DispatchStatus.CANCELLED,
        ]
        status_weights = [10, 10, 5, 65, 10]

        for _ in range(num_dispatches):
            dispatch_type = random.choices(
                [DispatchType.EMERGENCY_PICKUP, DispatchType.INTER_FACILITY_TRANSFER,
                 DispatchType.DISCHARGE_TRANSPORT, DispatchType.OTHER],
                weights=[45, 25, 25, 5],
            )[0]
            status = random.choices(status_pool, weights=status_weights)[0]
            ambulance = random.choice(ambulances) if random.random() < 0.9 else None

            patient, patient_name_freetext = self._resolve_patient(dispatch_type, existing_patients)

            requested_at = self._random_past_datetime(90)
            dispatched_at = dispatched_ago = None
            picked_up_at = None
            completed_at = None

            if status != DispatchStatus.REQUESTED and status != DispatchStatus.CANCELLED:
                dispatched_at = requested_at + timedelta(minutes=random.randint(3, 15))
            elif status == DispatchStatus.CANCELLED and random.random() < 0.5:
                dispatched_at = requested_at + timedelta(minutes=random.randint(3, 15))

            if status in (DispatchStatus.PATIENT_ONBOARD, DispatchStatus.COMPLETED):
                picked_up_at = (dispatched_at or requested_at) + timedelta(minutes=random.randint(5, 25))

            if status == DispatchStatus.COMPLETED:
                completed_at = (picked_up_at or requested_at) + timedelta(minutes=random.randint(10, 40))

            distance_km = Decimal(str(round(random.uniform(1.5, 35), 1)))

            dispatch = AmbulanceDispatch.objects.create(
                ambulance=ambulance,
                patient=patient,
                patient_name_freetext=patient_name_freetext,
                contact_phone=random_phone(),
                dispatch_type=dispatch_type,
                pickup_location=random.choice(LOCATIONS),
                destination="Facility" if dispatch_type != DispatchType.INTER_FACILITY_TRANSFER
                else random.choice(["Kenyatta National Hospital", "Aga Khan Hospital", "Nairobi Hospital"]),
                distance_km=distance_km,
                status=status,
                requested_by=random.choice(users),
                dispatched_at=dispatched_at,
                picked_up_at=picked_up_at,
                completed_at=completed_at,
                notes=random.choice([
                    "", "Patient stable during transport.", "Required oxygen support en route.",
                    "Family member accompanied patient.",
                ]),
            )
            # requested_at is auto_now_add, so backdate it directly.
            AmbulanceDispatch.objects.filter(pk=dispatch.pk).update(requested_at=requested_at)
            dispatch.requested_at = requested_at

            if status == DispatchStatus.COMPLETED and ambulance:
                invoice = self._create_invoice_for_dispatch(dispatch, ambulance, users)
                dispatch.invoice = invoice
                dispatch.save(update_fields=["invoice"])

            dispatches.append(dispatch)

        return dispatches

    def _resolve_patient(self, dispatch_type, existing_patients):
        # Discharge transport and inter-facility transfers are for already
        # known patients; emergency pickups are more likely to be unknown.
        if dispatch_type in (DispatchType.DISCHARGE_TRANSPORT, DispatchType.INTER_FACILITY_TRANSFER):
            known_probability = 0.9
        else:
            known_probability = 0.55

        if random.random() < known_probability:
            if existing_patients and random.random() < 0.5:
                return random.choice(existing_patients), ""
            patient = self._create_patient()
            existing_patients.append(patient)
            return patient, ""

        full_name, _ = random_full_name()
        return None, full_name

    @staticmethod
    def _create_patient():
        full_name, gender = random_full_name()
        return Patient.objects.create(
            full_name=full_name,
            gender=gender,
            dob=date.today() - timedelta(days=random.randint(365 * 1, 365 * 80)),
            phone=random_phone(),
            address=random.choice(LOCATIONS),
            national_id=random_national_id() if random.random() < 0.8 else None,
        )

    def _create_invoice_for_dispatch(self, dispatch, ambulance, users):
        amount = ambulance.base_fee + (ambulance.rate_per_km * (dispatch.distance_km or Decimal("0")))
        amount = amount.quantize(Decimal("0.01"))

        invoice = Invoice.objects.create(
            patient=dispatch.patient,
            source_type=InvoiceSourceType.EMERGENCY,
            description=f"Ambulance dispatch {dispatch.dispatch_number} ({dispatch.get_dispatch_type_display()})",
            amount=amount,
        ) if dispatch.patient else None

        if invoice is None:
            # Unregistered / unknown patient — still bill, but we need a
            # Patient FK, so create a minimal walk-in patient record for
            # billing purposes rather than leaving the trip unbilled.
            walk_in = Patient.objects.create(
                full_name=dispatch.patient_name_freetext or "Unknown Patient",
                gender=Gender.OTHER,
                phone=dispatch.contact_phone,
            )
            invoice = Invoice.objects.create(
                patient=walk_in,
                source_type=InvoiceSourceType.EMERGENCY,
                description=f"Ambulance dispatch {dispatch.dispatch_number} ({dispatch.get_dispatch_type_display()})",
                amount=amount,
            )

        if random.random() < 0.75:
            paid_fraction = random.choice([Decimal("1.0"), Decimal("1.0"), Decimal("0.5"), Decimal("0.3")])
            payment_amount = (amount * paid_fraction).quantize(Decimal("0.01"))
            if payment_amount > 0:
                Payment.objects.create(
                    invoice=invoice,
                    amount=payment_amount,
                    method=random.choice([
                        PaymentMethod.CASH, PaymentMethod.MPESA,
                        PaymentMethod.CARD, PaymentMethod.INSURANCE,
                    ]),
                    cashier=random.choice(users),
                )
                invoice.amount_paid = payment_amount
                invoice.recalculate_status()

        return invoice

    # ------------------------------------------------------------------
    def _seed_dispatch_crew(self, dispatches, ambulances, users):
        crew_by_ambulance = {}
        for ambulance in ambulances:
            crew_by_ambulance[ambulance.id] = list(ambulance.crew_members.all())

        for dispatch in dispatches:
            if not dispatch.ambulance:
                continue
            candidates = [cm.user for cm in crew_by_ambulance.get(dispatch.ambulance.id, [])] or users
            crew_size = min(len(candidates), random.randint(1, 3))
            chosen = random.sample(candidates, crew_size)
            roles_cycle = [CrewRole.DRIVER, CrewRole.PARAMEDIC, CrewRole.NURSE]
            for idx, user in enumerate(chosen):
                DispatchCrewMember.objects.get_or_create(
                    dispatch=dispatch,
                    user=user,
                    defaults={"role": roles_cycle[idx % len(roles_cycle)]},
                )

    # ------------------------------------------------------------------
    @staticmethod
    def _random_past_datetime(max_days_ago):
        return timezone.now() - timedelta(
            days=random.randint(0, max_days_ago),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )