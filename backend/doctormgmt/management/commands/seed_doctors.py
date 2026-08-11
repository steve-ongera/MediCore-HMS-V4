# doctormgmt/management/commands/seed_doctors.py
import random
from datetime import time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from api.models import User, Role, Consultation, Invoice, InvoiceSourceType, ConsultationStatus
from doctormgmt.models import (
    DoctorProfile,
    DoctorSchedule,
    DayOfWeek,
    DoctorCommission,
    CommissionStatus,
)

SPECIALTIES = [
    "General Medicine", "Gynecology", "Pediatrics", "Surgery",
    "Internal Medicine", "Orthopedics", "ENT", "Dermatology",
]

WEEKDAYS = [
    DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
]


class Command(BaseCommand):
    help = (
        "Seeds DoctorProfile + DoctorSchedule for existing users with role=DOCTOR, "
        "and backfills DoctorCommission from existing completed Consultations/Invoices. "
        "Safe to re-run — uses get_or_create throughout."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commission-rate",
            type=float,
            default=10.0,
            help="Default commission_rate_percent to set on newly created DoctorProfiles (default: 10.0).",
        )
        parser.add_argument(
            "--skip-commissions",
            action="store_true",
            help="Only create DoctorProfile/DoctorSchedule — skip backfilling DoctorCommission rows.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing to the database.",
        )

    def handle(self, *args, **options):
        commission_rate = Decimal(str(options["commission_rate"]))
        dry_run = options["dry_run"]
        skip_commissions = options["skip_commissions"]

        doctors = User.objects.filter(role=Role.DOCTOR, is_active_staff=True)
        if not doctors.exists():
            self.stdout.write(self.style.WARNING(
                "No users with role=DOCTOR found — nothing to seed. "
                "Create doctor users first."
            ))
            return

        self.stdout.write(f"Found {doctors.count()} doctor user(s).")

        profiles_created = schedules_created = commissions_created = 0

        with transaction.atomic():
            for user in doctors:
                profile, was_created = self._seed_profile(user, commission_rate, dry_run)
                if was_created:
                    profiles_created += 1

                schedules_created += self._seed_schedule(profile, user, dry_run)

            if not skip_commissions:
                commissions_created = self._seed_commissions(dry_run)

            if dry_run:
                self.stdout.write(self.style.WARNING("Dry run — rolling back transaction."))
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f"Done. Profiles created: {profiles_created}, "
            f"Schedules created: {schedules_created}, "
            f"Commissions created: {commissions_created}"
            f"{' (dry run, not saved)' if dry_run else ''}"
        ))

    # ------------------------------------------------------------------
    def _seed_profile(self, user, commission_rate, dry_run):
        defaults = {
            "specialty": random.choice(SPECIALTIES),
            "years_of_experience": random.randint(1, 25),
            "commission_rate_percent": commission_rate,
            "is_available_for_booking": True,
        }

        if dry_run:
            exists = DoctorProfile.objects.filter(user=user).exists()
            if not exists:
                self.stdout.write(f"  [would create] DoctorProfile for {user}")
            return DoctorProfile(user=user, **defaults), not exists

        profile, was_created = DoctorProfile.objects.get_or_create(
            user=user, defaults=defaults,
        )
        if was_created:
            self.stdout.write(f"  Created DoctorProfile for {user}")
        return profile, was_created

    # ------------------------------------------------------------------
    def _seed_schedule(self, profile, user, dry_run):
        created_count = 0
        department = user.department  # may be None

        for day in WEEKDAYS:
            if dry_run:
                exists = DoctorSchedule.objects.filter(
                    doctor__user=user, day_of_week=day, start_time=time(8, 0)
                ).exists()
                if not exists:
                    self.stdout.write(f"    [would create] {user}: {day} 08:00-16:00")
                    created_count += 1
                continue

            _, was_created = DoctorSchedule.objects.get_or_create(
                doctor=profile,
                day_of_week=day,
                start_time=time(8, 0),
                defaults={
                    "end_time": time(16, 0),
                    "department": department,
                    "max_patients": 20,
                    "is_active": True,
                },
            )
            if was_created:
                created_count += 1

        return created_count

    # ------------------------------------------------------------------
    def _seed_commissions(self, dry_run):
        """
        Backfill DoctorCommission from real completed consultations that
        have a corresponding paid consultation Invoice, and don't already
        have a commission record.
        """
        created_count = 0

        consultations = (
            Consultation.objects.filter(status=ConsultationStatus.COMPLETED)
            .select_related("doctor", "doctor__doctor_profile", "visit")
        )

        for consultation in consultations:
            doctor_user = consultation.doctor
            profile = getattr(doctor_user, "doctor_profile", None)
            if profile is None:
                continue  # doctor has no DoctorProfile — skip

            if DoctorCommission.objects.filter(consultation=consultation).exists():
                continue  # already backfilled

            invoice = (
                Invoice.objects.filter(
                    visit=consultation.visit,
                    source_type=InvoiceSourceType.CONSULTATION,
                )
                .order_by("-created_at")
                .first()
            )
            if invoice is None:
                continue  # nothing billed for this consultation yet

            fee = invoice.amount
            rate = profile.commission_rate_percent or Decimal("0")
            amount_earned = (fee * rate / Decimal("100")).quantize(Decimal("0.01"))

            completed_at = consultation.completed_at or consultation.started_at
            period_month = completed_at.month
            period_year = completed_at.year

            if dry_run:
                self.stdout.write(
                    f"    [would create] Commission {doctor_user}: "
                    f"KES {amount_earned} ({period_month}/{period_year})"
                )
                created_count += 1
                continue

            DoctorCommission.objects.create(
                doctor=profile,
                consultation=consultation,
                invoice=invoice,
                amount_earned=amount_earned,
                status=CommissionStatus.PENDING,
                period_month=period_month,
                period_year=period_year,
            )
            created_count += 1

        return created_count