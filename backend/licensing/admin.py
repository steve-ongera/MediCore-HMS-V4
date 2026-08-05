# licensing/admin.py
from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.contrib.auth.hashers import check_password

from .models import FacilityLicense


class FacilityLicenseAdminForm(forms.ModelForm):
    """
    Requires MediCore's confirmation email + password on every save. The
    actual gate is here in clean() — server-side — not in the JS popup.
    The JS popup (see change_form.html) only exists to *collect* the
    values before submit so the user isn't met with a bare validation
    error after filling out the whole form; someone could still disable
    JS and submit the hidden fields empty, and clean() below is what
    actually stops that.
    """
    confirm_email = forms.CharField(required=False, widget=forms.HiddenInput)
    confirm_password = forms.CharField(required=False, widget=forms.HiddenInput)

    class Meta:
        model = FacilityLicense
        fields = [
            "package", "license_key", "max_beds", "max_users", "licensed_to",
            "valid_from", "valid_until", "is_active", "notes",
        ]

    def clean(self):
        cleaned_data = super().clean()
        email = (cleaned_data.get("confirm_email") or "").strip().lower()
        password = cleaned_data.get("confirm_password") or ""

        expected_email = settings.MEDICORE_CONFIRM_EMAIL.strip().lower()

        # --- Option A (what's wired up below): literal match against a
        # hashed value in settings, loaded from an env var. Workable but
        # still a single shared credential everyone at MediCore has to know.
        password_ok = check_password(password, settings.MEDICORE_CONFIRM_PASSWORD_HASH)

        # --- Option B (recommended instead of Option A): authenticate
        # against a real MediCore-ops Django user account, so each person
        # has their own login and it's revocable/auditable per-person:
        #
        # from django.contrib.auth import authenticate
        # user = authenticate(username=email, password=password)
        # password_ok = bool(user and user.is_superuser)

        if email != expected_email or not password_ok:
            raise forms.ValidationError(
                "MediCore confirmation failed — email or password did not match. "
                "This change was not saved."
            )
        return cleaned_data


@admin.register(FacilityLicense)
class FacilityLicenseAdmin(admin.ModelAdmin):
    form = FacilityLicenseAdminForm
    change_form_template = "admin/licensing/facilitylicense/change_form.html"

    list_display = ["package", "max_beds", "max_users", "licensed_to", "is_active", "valid_until", "is_expired_display"]

    def is_expired_display(self, obj):
        return obj.is_expired
    is_expired_display.boolean = True
    is_expired_display.short_description = "Expired"

    def has_add_permission(self, request):
        # Only one FacilityLicense row is ever allowed for this deployment
        # (see FacilityLicense.save()). Hide the "Add" button once a row
        # already exists instead of letting the user hit the ValueError.
        return not FacilityLicense.objects.exists()

    def has_change_permission(self, request, obj=None):
        # Still gated to MediCore superuser accounts, same as
        # IsMediCoreOps / FacilityLicenseView.patch. The confirmation
        # popup is a second factor on top of this, not a replacement for it.
        return bool(request.user and request.user.is_superuser)

    def has_delete_permission(self, request, obj=None):
        # Deleting the license would leave the facility with no license
        # row at all, which every WithinBedLimit/WithinUserLimit check
        # currently treats as "no restrictions" (fail-open).
        return bool(request.user and request.user.is_superuser)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        messages.success(request, "License updated after MediCore confirmation.")