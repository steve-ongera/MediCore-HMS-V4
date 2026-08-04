"""
Management command to seed (or reset) the single FacilityLicense row used
by licensing checks throughout the app.

Intended for local/dev/test environments. In production, the license row
should be created/updated deliberately (e.g. via admin or a dedicated
provisioning flow) rather than through this command.

Usage:
    python manage.py seed_licenses
    python manage.py seed_licenses --package PROFESSIONAL --max-beds 150 --max-users 60
    python manage.py seed_licenses --licensed-to "St. Mary's Hospital" --valid-days 730
    python manage.py seed_licenses --inactive
    python manage.py seed_licenses --reset --package ENTERPRISE
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from licensing.models import FacilityLicense, LicensePackage


# Reasonable defaults per package tier — used when the caller doesn't
# explicitly override max_beds / max_users on the command line.
PACKAGE_DEFAULTS = {
    LicensePackage.STARTER: {"max_beds": 20, "max_users": 10},
    LicensePackage.STANDARD: {"max_beds": 50, "max_users": 25},
    LicensePackage.PROFESSIONAL: {"max_beds": 150, "max_users": 60},
    LicensePackage.ENTERPRISE: {"max_beds": 500, "max_users": 200},
    LicensePackage.CUSTOM: {"max_beds": 20, "max_users": 10},
}


class Command(BaseCommand):
    help = (
        "Seed or update the single FacilityLicense row used by licensing "
        "checks (bed/user creation limits). Safe to re-run — it updates "
        "the existing row in place instead of creating a second one, "
        "since FacilityLicense enforces a single-row table."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--package",
            choices=[c.value for c in LicensePackage],
            default=LicensePackage.PROFESSIONAL,
            help="License package tier to seed (default: PROFESSIONAL).",
        )
        parser.add_argument(
            "--max-beds",
            type=int,
            default=None,
            help="Override the package default for max_beds.",
        )
        parser.add_argument(
            "--max-users",
            type=int,
            default=None,
            help="Override the package default for max_users.",
        )
        parser.add_argument(
            "--licensed-to",
            type=str,
            default="Demo Facility",
            help="Facility/organization name to record on the license.",
        )
        parser.add_argument(
            "--license-key",
            type=str,
            default="DEV-SEED-0001",
            help="Reference/identifier string for the license agreement.",
        )
        parser.add_argument(
            "--valid-days",
            type=int,
            default=365,
            help="Days from today the license remains valid (default: 365).",
        )
        parser.add_argument(
            "--inactive",
            action="store_true",
            help="Seed the license as inactive (is_active=False), e.g. to "
                 "test suspended-license behavior.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete any existing FacilityLicense row before seeding "
                 "a fresh one, instead of updating it in place.",
        )

    def handle(self, *args, **options):
        package = options["package"]
        defaults = PACKAGE_DEFAULTS.get(
            package, PACKAGE_DEFAULTS[LicensePackage.STARTER]
        )

        max_beds = (
            options["max_beds"]
            if options["max_beds"] is not None
            else defaults["max_beds"]
        )
        max_users = (
            options["max_users"]
            if options["max_users"] is not None
            else defaults["max_users"]
        )

        if max_beds < 0 or max_users < 0:
            raise CommandError("--max-beds and --max-users must be non-negative.")

        existing = FacilityLicense.objects.first()

        with transaction.atomic():
            if options["reset"] and existing is not None:
                self.stdout.write(
                    self.style.WARNING("Deleting existing FacilityLicense row...")
                )
                existing.delete()
                existing = None

            valid_from = date.today()
            valid_until = valid_from + timedelta(days=options["valid_days"])

            field_values = dict(
                package=package,
                license_key=options["license_key"],
                max_beds=max_beds,
                max_users=max_users,
                licensed_to=options["licensed_to"],
                valid_from=valid_from,
                valid_until=valid_until,
                is_active=not options["inactive"],
                notes="Seeded by seed_licenses management command.",
            )

            if existing is not None:
                # A single-row config already exists — update it in place
                # rather than calling FacilityLicense.objects.create(),
                # which would trip the model's single-row save() guard.
                for field, value in field_values.items():
                    setattr(existing, field, value)
                existing.save()
                license_obj = existing
                action = "Updated"
            else:
                license_obj = FacilityLicense.objects.create(**field_values)
                action = "Created"

        self.stdout.write(
            self.style.SUCCESS(
                f"{action} FacilityLicense: {license_obj.package} — "
                f"{license_obj.max_beds} beds / {license_obj.max_users} users "
                f"(active={license_obj.is_active}, "
                f"valid_from={license_obj.valid_from}, "
                f"valid_until={license_obj.valid_until})"
            )
        )