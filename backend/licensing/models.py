#licensing/models.py
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
    Single-row config for this HMIS deployment's license. Read by
    permission checks at bed/user creation time.
    """
    package = models.CharField(max_length=20, choices=LicensePackage.choices, default=LicensePackage.STARTER)
    license_key = models.CharField(max_length=100, blank=True)

    max_beds = models.PositiveIntegerField(default=20, help_text="Total across inpatient + ICU/HDU beds combined.")
    max_users = models.PositiveIntegerField(default=10, help_text="Total active staff accounts across all roles.")
    max_patients = models.PositiveIntegerField(
        default=5000,
        help_text="Maximum total unique patient records this license permits across the whole group/facility.",
    )

    licensed_to = models.CharField(max_length=200, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    updated_at_display = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "facility_license"

    def save(self, *args, **kwargs):
        if not self.pk and FacilityLicense.objects.exists():
            raise ValueError("A facility license already exists — update it instead of creating a new one.")
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        from datetime import date
        return bool(self.valid_until and date.today() > self.valid_until)
    
    @property
    def current_patient_count(self):
        from api.models import Patient
        return Patient.objects.filter(is_deleted=False).count()

    @property
    def patients_remaining(self):
        return max(self.max_patients - self.current_patient_count, 0)

    @property
    def current_user_count(self):
        from api.models import User
        try:
            return User.objects.filter(is_active_staff=True).count()
        except Exception:
            return User.objects.filter(is_active=True).count()

    @property
    def current_bed_count(self):
        """
        NOT YET CONFIRMED against your real inpatient/models.py — I have
        never been able to see that file's contents in this conversation.
        This tries the most likely model/field combination
        (inpatient.Bed with a status field) and falls back to None if the
        model doesn't exist or the field names don't match, rather than
        silently returning a wrong number.

        Once you paste the real inpatient/models.py content as plain text
        in the chat, replace this whole property with the verified version —
        do not trust this number for enforcement until then.
        """
        try:
            from inpatient.models import Bed
        except (ImportError, ModuleNotFoundError):
            return None  # model doesn't exist under this name/location

        try:
            # Most common pattern: one row per physical bed, all rows count
            # regardless of occupied/available status (a bed under
            # maintenance is still a licensed bed, just temporarily unusable).
            count = Bed.objects.count()
        except Exception:
            return None

        # If ICU beds are tracked as a separate pool, add them too — same
        # defensive try/except, since I haven't seen icu/models.py confirmed
        # either.
        try:
            from icu.models import ICUBed
            count += ICUBed.objects.count()
        except (ImportError, ModuleNotFoundError):
            pass
        except Exception:
            pass

        return count

    @property
    def beds_remaining(self):
        if self.current_bed_count is None:
            return None
        return max(self.max_beds - self.current_bed_count, 0)

    @property
    def users_remaining(self):
        return max(self.max_users - self.current_user_count, 0)

    def __str__(self):
        return f"{self.package} - {self.max_beds} beds / {self.max_users} users"


def get_active_license():
    return FacilityLicense.objects.filter(is_active=True).first()