# licensing/admin.py
from django.contrib import admin
from .models import FacilityLicense

@admin.register(FacilityLicense)
class FacilityLicenseAdmin(admin.ModelAdmin):
    list_display = ["package", "max_beds", "max_users", "licensed_to", "is_active", "valid_until"]