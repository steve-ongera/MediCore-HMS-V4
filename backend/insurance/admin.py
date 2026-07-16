from django.contrib import admin

from .models import Insurer, PatientInsurancePolicy, EligibilityCheck, InsuranceClaim, ClaimItem


class ClaimItemInline(admin.TabularInline):
    model = ClaimItem
    extra = 0


@admin.register(Insurer)
class InsurerAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "insurer_type", "requires_preauth", "is_active"]
    list_filter = ["insurer_type", "is_active"]
    search_fields = ["name", "code"]


@admin.register(PatientInsurancePolicy)
class PatientInsurancePolicyAdmin(admin.ModelAdmin):
    list_display = ["patient", "insurer", "member_number", "is_active", "valid_to"]
    list_filter = ["insurer", "is_active"]
    search_fields = ["patient__full_name", "member_number"]


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ["claim_number", "patient", "policy", "status", "total_claimed", "total_approved"]
    list_filter = ["status"]
    search_fields = ["claim_number", "patient__full_name"]
    inlines = [ClaimItemInline]


admin.site.register(EligibilityCheck)