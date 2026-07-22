"""
Management command: seed_dialysis

Seeds the dialysis module with:
  - A handful of DialysisMachine records
  - Patients (created fresh in api.Patient if they don't already exist,
    matched on national_id)
  - DialysisPatientProfile records linked to those patients
  - A history of DialysisSession records going back a configurable number
    of weeks, honoring each profile's sessions_per_week
  - An Invoice (source_type=PROCEDURE) for every session, plus a Payment
    for sessions marked as paid

Usage:
    python manage.py seed_dialysis
    python manage.py seed_dialysis --weeks 8
    python manage.py seed_dialysis --clear     # wipe previously seeded data first

The command is safe to re-run: patients are matched on national_id, and a
profile that already has sessions will not have sessions regenerated
(preventing duplicate history on repeated runs). Use --clear to start over.
"""

import random
from datetime import timedelta, time
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
    InvoiceStatus,
    Payment,
    PaymentMethod,
)
from dialysis.models import (
    DialysisMachine,
    MachineStatus,
    DialysisPatientProfile,
    VascularAccessType,
    DialysisPatientStatus,
    DialysisSession,
    SessionStatus,
)


# ---------------------------------------------------------------------------
# Sample data — edit / extend freely
# ---------------------------------------------------------------------------
MACHINES = [
    {"machine_number": "DM-001", "make_model": "Fresenius 4008S", "rate_per_session": Decimal("4500.00")},
    {"machine_number": "DM-002", "make_model": "Fresenius 4008S", "rate_per_session": Decimal("4500.00")},
    {"machine_number": "DM-003", "make_model": "Nikkiso DBB-EXA", "rate_per_session": Decimal("4800.00")},
    {"machine_number": "DM-004", "make_model": "B.Braun Dialog+", "rate_per_session": Decimal("4700.00")},
]

PATIENTS = [
    {
        "full_name": "James Mwangi Kariuki",
        "gender": Gender.MALE,
        "dob": "1968-03-14",
        "phone": "0722334455",
        "national_id": "12345671",
        "address": "Kasarani, Nairobi",
        "next_of_kin_name": "Grace Mwangi",
        "next_of_kin_phone": "0733445566",
        "next_of_kin_relationship": "Spouse",
        "profile": {
            "primary_diagnosis": "ESRD secondary to hypertensive nephrosclerosis",
            "dry_weight_kg": Decimal("68.50"),
            "vascular_access_type": VascularAccessType.AV_FISTULA,
            "access_site_notes": "Left forearm fistula, functioning well",
            "sessions_per_week": 3,
            "session_duration_hours": Decimal("4.0"),
            "dialyzer_type": "High-flux polysulfone F8",
            "anticoagulation_protocol": "Heparin - standard dose",
            "started_on": "2023-01-10",
        },
    },
    {
        "full_name": "Susan Achieng Otieno",
        "gender": Gender.FEMALE,
        "dob": "1975-07-22",
        "phone": "0711223344",
        "national_id": "23456782",
        "address": "Umoja, Nairobi",
        "next_of_kin_name": "Peter Otieno",
        "next_of_kin_phone": "0700112233",
        "next_of_kin_relationship": "Sibling",
        "profile": {
            "primary_diagnosis": "ESRD secondary to diabetic nephropathy",
            "dry_weight_kg": Decimal("59.00"),
            "vascular_access_type": VascularAccessType.AV_GRAFT,
            "access_site_notes": "Right forearm graft, mild induration noted last check",
            "sessions_per_week": 3,
            "session_duration_hours": Decimal("3.5"),
            "dialyzer_type": "Low-flux F6",
            "anticoagulation_protocol": "Heparin - low dose (bleeding risk)",
            "started_on": "2022-09-01",
        },
    },
    {
        "full_name": "Daniel Kiptoo Rono",
        "gender": Gender.MALE,
        "dob": "1990-11-05",
        "phone": "0700998877",
        "national_id": "34567893",
        "address": "Ongata Rongai, Kajiado",
        "next_of_kin_name": "Faith Rono",
        "next_of_kin_phone": "0722998877",
        "next_of_kin_relationship": "Spouse",
        "profile": {
            "primary_diagnosis": "ESRD, cause undetermined - biopsy pending",
            "dry_weight_kg": Decimal("74.20"),
            "vascular_access_type": VascularAccessType.CENTRAL_CATHETER,
            "access_site_notes": "Right IJ tunneled catheter, dressing changed each session",
            "sessions_per_week": 2,
            "session_duration_hours": Decimal("4.0"),
            "dialyzer_type": "High-flux F8",
            "anticoagulation_protocol": "Heparin - standard dose",
            "started_on": "2024-05-20",
        },
    },
]

COMPLICATIONS_POOL = ["", "", "", "Mild hypotension during session, managed with saline bolus", "Cramping in lower limbs, resolved"]
NURSING_NOTES_POOL = [
    "Session tolerated well, no complications.",
    "Patient stable throughout session.",
    "Access site clean, no signs of infection.",
    "Patient reported mild fatigue post-session.",
]


class Command(BaseCommand):
    help = "Seed dialysis machines, patients, profiles, sessions, invoices and payments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--weeks",
            type=int,
            default=6,
            help="How many weeks of session history to generate per patient (default: 6).",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously seeded dialysis machines/profiles/sessions before seeding.",
        )

    def handle(self, *args, **options):
        weeks = options["weeks"]
        clear = options["clear"]

        if clear:
            self._clear()

        with transaction.atomic():
            machines = self._seed_machines()
            nephrologist = self._get_staff(Role.DOCTOR)
            registrar = self._get_staff(Role.NURSE) or nephrologist

            for entry in PATIENTS:
                patient = self._get_or_create_patient(entry, registrar)
                profile = self._get_or_create_profile(patient, entry["profile"], nephrologist, registrar)
                self._seed_sessions(profile, machines, weeks, registrar)

        self.stdout.write(self.style.SUCCESS("Dialysis seed data created successfully."))

    # ------------------------------------------------------------------
    def _clear(self):
        self.stdout.write("Clearing existing dialysis sessions, profiles and machines...")
        DialysisSession.objects.all().delete()
        DialysisPatientProfile.objects.all().delete()
        DialysisMachine.objects.all().delete()

    def _seed_machines(self):
        machines = []
        for m in MACHINES:
            machine, created = DialysisMachine.objects.get_or_create(
                machine_number=m["machine_number"],
                defaults={
                    "make_model": m["make_model"],
                    "rate_per_session": m["rate_per_session"],
                    "status": MachineStatus.AVAILABLE,
                    "is_active": True,
                },
            )
            machines.append(machine)
            if created:
                self.stdout.write(f"  + machine {machine.machine_number}")
        return machines

    def _get_staff(self, role):
        return User.objects.filter(role=role, is_active_staff=True).first()

    def _get_or_create_patient(self, entry, registrar):
        patient, created = Patient.objects.get_or_create(
            national_id=entry["national_id"],
            defaults={
                "full_name": entry["full_name"],
                "gender": entry["gender"],
                "dob": entry["dob"],
                "phone": entry["phone"],
                "address": entry["address"],
                "next_of_kin_name": entry["next_of_kin_name"],
                "next_of_kin_phone": entry["next_of_kin_phone"],
                "next_of_kin_relationship": entry["next_of_kin_relationship"],
                "created_by": registrar,
            },
        )
        if created:
            self.stdout.write(f"  + patient {patient.full_name} ({patient.hospital_number})")
        return patient

    def _get_or_create_profile(self, patient, profile_data, nephrologist, registrar):
        profile, created = DialysisPatientProfile.objects.get_or_create(
            patient=patient,
            defaults={
                **profile_data,
                "status": DialysisPatientStatus.ACTIVE,
                "nephrologist": nephrologist,
                "registered_by": registrar,
            },
        )
        if created:
            self.stdout.write(f"    + dialysis profile {profile.profile_number}")
        return profile

    def _seed_sessions(self, profile, machines, weeks, performed_by):
        if profile.sessions.exists():
            self.stdout.write(f"    (skipping sessions for {profile.profile_number} - already has history)")
            return

        total_sessions = weeks * profile.sessions_per_week
        now = timezone.now()
        # Spread sessions evenly across the window, oldest first.
        interval_days = (weeks * 7) / total_sessions if total_sessions else 0

        for i in range(total_sessions):
            days_ago = int((total_sessions - i) * interval_days)
            scheduled = (now - timedelta(days=days_ago)).replace(
                hour=8, minute=0, second=0, microsecond=0
            )
            machine = random.choice(machines)
            is_past = scheduled <= now

            pre_weight = profile.dry_weight_kg + Decimal(random.uniform(1.0, 3.0)).quantize(Decimal("0.01"))
            post_weight = profile.dry_weight_kg + Decimal(random.uniform(0.0, 0.5)).quantize(Decimal("0.01"))

            session = DialysisSession.objects.create(
                profile=profile,
                machine=machine,
                scheduled_date=scheduled,
                status=SessionStatus.COMPLETED if is_past else SessionStatus.SCHEDULED,
                started_at=scheduled if is_past else None,
                ended_at=(scheduled + timedelta(hours=float(profile.session_duration_hours))) if is_past else None,
                pre_weight_kg=pre_weight if is_past else None,
                post_weight_kg=post_weight if is_past else None,
                pre_bp_systolic=random.randint(130, 160) if is_past else None,
                pre_bp_diastolic=random.randint(80, 95) if is_past else None,
                post_bp_systolic=random.randint(110, 135) if is_past else None,
                post_bp_diastolic=random.randint(70, 85) if is_past else None,
                ultrafiltration_target_ml=random.randint(1500, 3000) if is_past else None,
                blood_flow_rate=random.choice([250, 300, 350]) if is_past else None,
                dialysate_flow_rate=random.choice([500, 600]) if is_past else None,
                complications=random.choice(COMPLICATIONS_POOL) if is_past else "",
                nursing_notes=random.choice(NURSING_NOTES_POOL) if is_past else "",
                performed_by=performed_by if is_past else None,
            )

            if is_past:
                self._invoice_session(session, machine, performed_by)

        self.stdout.write(f"    + {total_sessions} sessions for {profile.profile_number}")

    def _invoice_session(self, session, machine, cashier):
        invoice = Invoice.objects.create(
            patient=session.profile.patient,
            source_type=InvoiceSourceType.PROCEDURE,
            description=f"Dialysis session {session.session_number} on machine {machine.machine_number}",
            amount=machine.rate_per_session,
        )

        # Roughly 85% of past sessions are fully paid, the rest left unpaid
        # so the seed data has something to reconcile against.
        if random.random() < 0.85:
            Payment.objects.create(
                invoice=invoice,
                amount=invoice.amount,
                method=random.choice([PaymentMethod.CASH, PaymentMethod.MPESA, PaymentMethod.INSURANCE]),
                cashier=cashier,
            )
            invoice.amount_paid = invoice.amount
            invoice.recalculate_status()

        session.invoice = invoice
        session.save(update_fields=["invoice"])