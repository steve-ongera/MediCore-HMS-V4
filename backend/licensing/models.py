from django.db import models
from api.models import BaseModel


class LicensePackage(models.TextChoices):
    STARTER = "STARTER", "Starter"
    STANDARD = "STANDARD", "Standard"
    PROFESSIONAL = "PROFESSIONAL", "Professional"
    ENTERPRISE = "ENTERPRISE", "Enterprise"
    CUSTOM = "CUSTOM", "Custom"


class FacilityLicense(BaseModel):
    """
    Single-row config (one per HMIS deployment/facility) defining what this
    installation is licensed for. Read by permission checks at bed/user
    creation time — never trust a frontend-only limit for a licensing
    boundary since the API can always be hit directly.
    """
    package = models.CharField(max_length=20, choices=LicensePackage.choices, default=LicensePackage.STARTER)
    license_key = models.CharField(max_length=100, blank=True, help_text="Reference/identifier for this license agreement.")

    max_beds = models.PositiveIntegerField(default=20, help_text="Total across inpatient + ICU/HDU beds combined.")
    max_users = models.PositiveIntegerField(default=10, help_text="Total active staff accounts across all roles.")

    licensed_to = models.CharField(max_length=200, blank=True, help_text="Facility/organization name on the license.")
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True, help_text="Deactivating this suspends new bed/user creation without deleting existing data.")
    notes = models.TextField(blank=True)

    updated_at_display = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "facility_license"

    def save(self, *args, **kwargs):
        # Enforce single-row: this table should only ever have one config
        # for the whole deployment.
        if not self.pk and FacilityLicense.objects.exists():
            raise ValueError("A facility license already exists — update it instead of creating a new one.")
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        from datetime import date
        return bool(self.valid_until and date.today() > self.valid_until)

    @property
    def current_bed_count(self):
        from inpatient.models import Bed
        count = Bed.objects.count()
        try:
            from icu.models import ICUBed
            count += ICUBed.objects.count()
        except Exception:
            pass
        return count

    @property
    def current_user_count(self):
        from api.models import User
        return User.objects.filter(is_active_staff=True).count()

    @property
    def beds_remaining(self):
        return max(self.max_beds - self.current_bed_count, 0)

    @property
    def users_remaining(self):
        return max(self.max_users - self.current_user_count, 0)

    def __str__(self):
        return f"{self.package} - {self.max_beds} beds / {self.max_users} users"


def get_active_license():
    """Convenience accessor — the whole app has exactly one license row."""
    return FacilityLicense.objects.filter(is_active=True).first()