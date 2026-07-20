from django.contrib import admin

from .models import BloodDonor, BloodDonation, BloodUnit, BloodRequest, BloodIssue


class BloodIssueInline(admin.TabularInline):
    model = BloodIssue
    extra = 0


@admin.register(BloodDonor)
class BloodDonorAdmin(admin.ModelAdmin):
    list_display = ["donor_number", "full_name", "blood_group", "status"]
    list_filter = ["blood_group", "status"]
    search_fields = ["donor_number", "full_name", "national_id"]


@admin.register(BloodDonation)
class BloodDonationAdmin(admin.ModelAdmin):
    list_display = ["donation_number", "donor", "donation_date", "volume_ml"]


@admin.register(BloodUnit)
class BloodUnitAdmin(admin.ModelAdmin):
    list_display = ["unit_number", "blood_group", "component_type", "status", "expiry_date"]
    list_filter = ["blood_group", "component_type", "status"]
    search_fields = ["unit_number"]


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = ["request_number", "patient", "patient_blood_group", "priority", "status"]
    list_filter = ["status", "priority"]
    search_fields = ["request_number", "patient__full_name"]
    inlines = [BloodIssueInline]