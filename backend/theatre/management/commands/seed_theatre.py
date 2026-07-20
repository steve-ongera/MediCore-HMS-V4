"""
Management command: seed_theatre

Seeds demo data for the theatre app. Creates its own supporting data
(Patients, Medicines + MedicineBatches, Invoices) since the theatre models
depend on them, then builds OperatingTheatres, SurgicalProcedureCatalog
entries, SurgeryBookings, Surgery episodes (with team + consumables +
post-op notes), all linked with Invoices.

Place at: theatre/management/commands/seed_theatre.py
(remember the two empty __init__.py files under
theatre/management/ and theatre/management/commands/)

Usage:
    python manage.py seed_theatre
    python manage.py seed_theatre --flush   # wipe previously seeded rows first
"""

import random
from datetime import timedelta, date

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    User,
    Role,
    Patient,
    Gender,
    Medicine,
    MedicineBatch,
    Invoice,
    InvoiceSourceType,
    InvoiceStatus,
)

from theatre.models import (
    OperatingTheatre,
    TheatreStatus,
    SurgicalProcedureCatalog,
    SurgeryBooking,
    BookingPriority,
    BookingStatus,
    Surgery,
    SurgeryStatus,
    SurgeryOutcome,
    SurgicalTeamMember,
    TeamRole,
    ConsumableUsage,
    PostOpNote,
)


SEED_TAG = "SEED-THEATRE"  # used to make records identifiable / re-runnable


# ---------------------------------------------------------------------------
# Raw seed data
# ---------------------------------------------------------------------------

PATIENTS_DATA = [
    dict(full_name="Wanjiru Kamau", gender=Gender.FEMALE, dob=date(1990, 4, 12),
         phone="0711000101", national_id="SEEDNID-101", address="Kilimani, Nairobi"),
    dict(full_name="Otieno Odhiambo", gender=Gender.MALE, dob=date(1985, 9, 3),
         phone="0711000102", national_id="SEEDNID-102", address="Kisumu Central"),
    dict(full_name="Amina Yusuf", gender=Gender.FEMALE, dob=date(1998, 1, 27),
         phone="0711000103", national_id="SEEDNID-103", address="Eastleigh, Nairobi"),
    dict(full_name="Kiptoo Kibet", gender=Gender.MALE, dob=date(1975, 6, 30),
         phone="0711000104", national_id="SEEDNID-104", address="Eldoret Town"),
    dict(full_name="Njeri Mwangi", gender=Gender.FEMALE, dob=date(2003, 11, 15),
         phone="0711000105", national_id="SEEDNID-105", address="Thika Road, Nairobi"),
    dict(full_name="Mutua Ndolo", gender=Gender.MALE, dob=date(1966, 2, 8),
         phone="0711000106", national_id="SEEDNID-106", address="Machakos Town"),
    dict(full_name="Achieng Auma", gender=Gender.FEMALE, dob=date(1992, 7, 19),
         phone="0711000107", national_id="SEEDNID-107", address="Kondele, Kisumu"),
    dict(full_name="Barasa Wafula", gender=Gender.MALE, dob=date(1988, 12, 1),
         phone="0711000108", national_id="SEEDNID-108", address="Bungoma Town"),
]

MEDICINES_DATA = [
    dict(name="Sterile Gauze Swab", generic_name="", category="Consumable",
         unit="pack", unit_price=150, reorder_level=50),
    dict(name="Surgical Suture 2-0 Vicryl", generic_name="Polyglactin 910",
         category="Consumable", unit="piece", unit_price=450, reorder_level=30),
    dict(name="Lidocaine 2% Injection", generic_name="Lidocaine Hydrochloride",
         category="Anaesthetic", unit="vial", unit_price=200, reorder_level=40),
    dict(name="Propofol 200mg/20ml", generic_name="Propofol",
         category="Anaesthetic", unit="vial", unit_price=900, reorder_level=20),
    dict(name="IV Cannula 18G", generic_name="", category="Consumable",
         unit="piece", unit_price=80, reorder_level=100),
    dict(name="Normal Saline 0.9% 1L", generic_name="Sodium Chloride",
         category="Fluid", unit="bag", unit_price=250, reorder_level=60),
    dict(name="Surgical Gloves (Sterile) Pair", generic_name="",
         category="Consumable", unit="pair", unit_price=60, reorder_level=200),
    dict(name="Ceftriaxone 1g Injection", generic_name="Ceftriaxone",
         category="Antibiotic", unit="vial", unit_price=350, reorder_level=40),
]

THEATRES_DATA = [
    dict(theatre_number="OT-1", hourly_rate=4500),
    dict(theatre_number="OT-2", hourly_rate=4500),
    dict(theatre_number="OT-3", hourly_rate=6000),
]

PROCEDURES_DATA = [
    dict(code="SURG-001", name="Appendectomy", base_price=45000, estimated_duration_minutes=60),
    dict(code="SURG-002", name="Cholecystectomy (Laparoscopic)", base_price=85000, estimated_duration_minutes=90),
    dict(code="SURG-003", name="Caesarean Section", base_price=60000, estimated_duration_minutes=45),
    dict(code="SURG-004", name="Hernia Repair", base_price=50000, estimated_duration_minutes=75),
    dict(code="SURG-005", name="Tonsillectomy", base_price=30000, estimated_duration_minutes=40),
    dict(code="SURG-006", name="Closed Fracture Reduction", base_price=35000, estimated_duration_minutes=50),
]

FALLBACK_STAFF = [
    dict(username="seed_dr_mwangi", first_name="Peter", last_name="Mwangi",
         role=Role.DOCTOR, email="dr.mwangi@example.com"),
    dict(username="seed_dr_atieno", first_name="Grace", last_name="Atieno",
         role=Role.DOCTOR, email="dr.atieno@example.com"),
    dict(username="seed_nurse_chebet", first_name="Faith", last_name="Chebet",
         role=Role.NURSE, email="nurse.chebet@example.com"),
    dict(username="seed_nurse_owino", first_name="Brian", last_name="Owino",
         role=Role.NURSE, email="nurse.owino@example.com"),
]


class Command(BaseCommand):
    help = "Seed the theatre module with demo Patients, Medicines, Invoices, and surgical records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete previously seeded theatre records (and this script's patients/medicines) before reseeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        with transaction.atomic():
            patients = self._seed_patients()
            medicines = self._seed_medicines()
            doctors, nurses = self._seed_staff()
            theatres = self._seed_theatres()
            procedures = self._seed_procedures()
            bookings = self._seed_bookings(patients, procedures, theatres, doctors)
            self._seed_surgeries(bookings, theatres, doctors, nurses, medicines)

        self.stdout.write(self.style.SUCCESS("Theatre seed data created successfully."))

    # -- flush -------------------------------------------------------------

    def _flush(self):
        self.stdout.write("Flushing previously seeded theatre data...")
        PostOpNote.objects.filter(surgery__booking__booking_number__isnull=False).delete()
        ConsumableUsage.objects.all().delete()
        SurgicalTeamMember.objects.all().delete()
        Surgery.objects.all().delete()
        SurgeryBooking.objects.all().delete()
        SurgicalProcedureCatalog.objects.filter(code__in=[p["code"] for p in PROCEDURES_DATA]).delete()
        OperatingTheatre.objects.filter(theatre_number__in=[t["theatre_number"] for t in THEATRES_DATA]).delete()
        Invoice.objects.filter(description__startswith=SEED_TAG).delete()
        Medicine.objects.filter(name__in=[m["name"] for m in MEDICINES_DATA]).delete()
        Patient.objects.filter(national_id__in=[p["national_id"] for p in PATIENTS_DATA]).delete()
        User.objects.filter(username__in=[s["username"] for s in FALLBACK_STAFF]).delete()

    # -- supporting data -----------------------------------------------------

    def _seed_patients(self):
        patients = []
        for data in PATIENTS_DATA:
            patient, created = Patient.objects.get_or_create(
                national_id=data["national_id"],
                defaults=data,
            )
            patients.append(patient)
            self.stdout.write(f"  Patient {'created' if created else 'exists'}: {patient}")
        return patients

    def _seed_medicines(self):
        medicines = []
        for data in MEDICINES_DATA:
            medicine, created = Medicine.objects.get_or_create(
                name=data["name"],
                defaults=data,
            )
            medicines.append(medicine)

            # make sure each medicine has a usable, non-expired batch
            batch, batch_created = MedicineBatch.objects.get_or_create(
                medicine=medicine,
                batch_number=f"{SEED_TAG}-BATCH-1",
                defaults=dict(
                    quantity_received=500,
                    quantity_remaining=500,
                    expiry_date=timezone.now().date() + timedelta(days=365),
                ),
            )
            self.stdout.write(
                f"  Medicine {'created' if created else 'exists'}: {medicine} "
                f"(batch {'created' if batch_created else 'exists'})"
            )
        return medicines

    def _seed_staff(self):
        doctors = list(User.objects.filter(role=Role.DOCTOR, is_active_staff=True))
        nurses = list(User.objects.filter(role=Role.NURSE, is_active_staff=True))

        if not doctors or not nurses:
            self.stdout.write(self.style.WARNING(
                "  No existing Doctor/Nurse users found for missing role(s); creating fallback staff."
            ))
            for data in FALLBACK_STAFF:
                user, created = User.objects.get_or_create(
                    username=data["username"],
                    defaults={
                        "first_name": data["first_name"],
                        "last_name": data["last_name"],
                        "role": data["role"],
                        "email": data["email"],
                        "is_active_staff": True,
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                self.stdout.write(f"  Staff {'created' if created else 'exists'}: {user}")

            doctors = list(User.objects.filter(role=Role.DOCTOR, is_active_staff=True))
            nurses = list(User.objects.filter(role=Role.NURSE, is_active_staff=True))

        return doctors, nurses

    def _seed_theatres(self):
        theatres = []
        for data in THEATRES_DATA:
            theatre, created = OperatingTheatre.objects.get_or_create(
                theatre_number=data["theatre_number"],
                defaults=data,
            )
            theatres.append(theatre)
            self.stdout.write(f"  Theatre {'created' if created else 'exists'}: {theatre}")
        return theatres

    def _seed_procedures(self):
        procedures = []
        for data in PROCEDURES_DATA:
            procedure, created = SurgicalProcedureCatalog.objects.get_or_create(
                code=data["code"],
                defaults=data,
            )
            procedures.append(procedure)
            self.stdout.write(f"  Procedure {'created' if created else 'exists'}: {procedure}")
        return procedures

    # -- bookings & invoices --------------------------------------------------

    def _make_invoice(self, patient, source_type, description, amount):
        invoice = Invoice.objects.create(
            patient=patient,
            source_type=source_type,
            description=f"{SEED_TAG}: {description}",
            amount=amount,
        )
        return invoice

    def _seed_bookings(self, patients, procedures, theatres, doctors):
        bookings = []
        now = timezone.now()

        for i, patient in enumerate(patients):
            procedure = procedures[i % len(procedures)]
            theatre = theatres[i % len(theatres)]
            surgeon = doctors[i % len(doctors)] if doctors else None
            priority = random.choice(list(BookingPriority.values))

            booking, created = SurgeryBooking.objects.get_or_create(
                patient=patient,
                procedure=procedure,
                requested_date=now + timedelta(days=i - 3),
                defaults=dict(
                    priority=priority,
                    status=BookingStatus.CONFIRMED,
                    theatre=theatre,
                    primary_surgeon=surgeon,
                    diagnosis=f"{SEED_TAG}: diagnosis pending confirmation for {procedure.name}.",
                    pre_op_notes=f"{SEED_TAG}: routine pre-op workup completed.",
                    requested_by=surgeon,
                ),
            )

            if created:
                # link an invoice for the procedure fee (Invoice has no FK back
                # to SurgeryBooking, so we just create it against the patient)
                self._make_invoice(
                    patient=patient,
                    source_type=InvoiceSourceType.PROCEDURE,
                    description=f"Procedure fee - {procedure.name} ({booking.booking_number})",
                    amount=procedure.base_price,
                )

            bookings.append(booking)
            self.stdout.write(f"  Booking {'created' if created else 'exists'}: {booking}")

        return bookings

    # -- surgeries, teams, consumables, post-op ------------------------------

    def _seed_surgeries(self, bookings, theatres, doctors, nurses, medicines):
        # Only take about two thirds of bookings into theatre, to leave some
        # bookings realistically still just "confirmed" / not yet operated on.
        cutoff = max(1, int(len(bookings) * 0.7))

        for i, booking in enumerate(bookings[:cutoff]):
            theatre = booking.theatre or theatres[i % len(theatres)]

            surgery, created = Surgery.objects.get_or_create(
                booking=booking,
                defaults=dict(
                    theatre=theatre,
                    status=SurgeryStatus.COMPLETED,
                    outcome=SurgeryOutcome.SUCCESSFUL,
                    operative_notes=f"{SEED_TAG}: procedure completed without incident.",
                    estimated_blood_loss_ml=random.choice([50, 100, 150, 200]),
                ),
            )

            if not created:
                self.stdout.write(f"  Surgery exists: {surgery}")
                continue

            # backfill timestamps now that theatre_in_at is auto_now_add
            incision = surgery.theatre_in_at + timedelta(minutes=15)
            closure = incision + timedelta(minutes=random.choice([40, 60, 90]))
            theatre_out = closure + timedelta(minutes=10)
            Surgery.objects.filter(pk=surgery.pk).update(
                incision_at=incision,
                closure_at=closure,
                theatre_out_at=theatre_out,
            )
            surgery.refresh_from_db()

            booking.status = BookingStatus.COMPLETED
            booking.save(update_fields=["status"])

            # -- surgical team
            surgeon = booking.primary_surgeon or (doctors[0] if doctors else None)
            if surgeon:
                SurgicalTeamMember.objects.get_or_create(
                    surgery=surgery, user=surgeon, role=TeamRole.PRIMARY_SURGEON,
                    defaults=dict(fee=15000),
                )
            if len(doctors) > 1:
                assistant = doctors[(i + 1) % len(doctors)]
                if assistant != surgeon:
                    SurgicalTeamMember.objects.get_or_create(
                        surgery=surgery, user=assistant, role=TeamRole.ASSISTANT_SURGEON,
                        defaults=dict(fee=8000),
                    )
            if nurses:
                scrub_nurse = nurses[i % len(nurses)]
                SurgicalTeamMember.objects.get_or_create(
                    surgery=surgery, user=scrub_nurse, role=TeamRole.SCRUB_NURSE,
                    defaults=dict(fee=3000),
                )

            # -- consumables used, billed on their own invoice
            used_medicines = random.sample(medicines, k=min(3, len(medicines)))
            consumable_total = 0
            for medicine in used_medicines:
                batch = medicine.batches.filter(is_deleted=False).first()
                qty = random.choice([1, 2, 3])
                consumable_total += medicine.unit_price * qty

            consumables_invoice = self._make_invoice(
                patient=booking.patient,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"Theatre consumables - {booking.booking_number}",
                amount=consumable_total,
            )

            recorder = nurses[i % len(nurses)] if nurses else surgeon
            for medicine in used_medicines:
                batch = medicine.batches.filter(is_deleted=False).first()
                qty = random.choice([1, 2, 3])
                ConsumableUsage.objects.create(
                    surgery=surgery,
                    medicine=medicine,
                    batch=batch,
                    quantity=qty,
                    invoice=consumables_invoice,
                    recorded_by=recorder,
                )
                if batch:
                    batch.quantity_remaining = max(batch.quantity_remaining - qty, 0)
                    batch.save(update_fields=["quantity_remaining"])

            # -- post-op note
            PostOpNote.objects.create(
                surgery=surgery,
                recorded_by=recorder,
                bp_systolic=random.randint(105, 130),
                bp_diastolic=random.randint(65, 85),
                pulse_bpm=random.randint(65, 95),
                oxygen_saturation=random.randint(95, 99),
                consciousness_level="Alert",
                pain_score=random.randint(1, 4),
                notes=f"{SEED_TAG}: patient stable post-op, transferred to recovery ward.",
            )

            self.stdout.write(self.style.SUCCESS(f"  Surgery created: {surgery}"))