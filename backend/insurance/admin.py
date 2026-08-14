from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import (
    Insurer,
    PatientInsurancePolicy,
    EligibilityCheck,
    InsuranceClaim,
    ClaimItem,
)


class ClaimItemInline(admin.TabularInline):
    model = ClaimItem
    extra = 0
    fields = ["invoice", "benefit_code", "amount_claimed", "amount_approved"]
    raw_id_fields = ["invoice"]


@admin.register(Insurer)
class InsurerAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "insurer_type", "requires_preauth", "is_active"]
    list_filter = ["insurer_type", "requires_preauth", "is_active"]
    search_fields = ["name", "code", "contact_email", "contact_phone"]
    ordering = ["name"]
    list_editable = ["is_active", "requires_preauth"]


@admin.register(PatientInsurancePolicy)
class PatientInsurancePolicyAdmin(admin.ModelAdmin):
    list_display = [
        "patient",
        "insurer",
        "member_number",
        "scheme_name",
        "relationship",
        "is_active",
        "is_currently_valid",
        "valid_to",
    ]
    list_filter = ["insurer", "relationship", "is_active"]
    search_fields = ["member_number", "scheme_name", "principal_member_name"]
    raw_id_fields = ["patient", "insurer", "registered_by"]
    readonly_fields = ["is_currently_valid"]
    list_select_related = ["patient", "insurer"]


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = [
        "claim_number",
        "patient",
        "policy",
        "status",
        "total_claimed",
        "total_approved",
        "submitted_at",
    ]
    list_filter = ["status", "submitted_at"]
    search_fields = ["claim_number", "gateway_reference"]
    raw_id_fields = ["patient", "policy", "visit", "created_by"]
    readonly_fields = ["claim_number"]
    inlines = [ClaimItemInline]
    list_select_related = ["patient", "policy"]

    fieldsets = (
        (
            _("Claim Detail"),
            {
                "fields": (
                    "claim_number",
                    "patient",
                    "policy",
                    "visit",
                    "status",
                    "gateway_reference",
                )
            },
        ),
        (
            _("Financials"),
            {
                "fields": ("total_claimed", "total_approved"),
            },
        ),
        (
            _("Processing & Audit"),
            {
                "fields": (
                    "submitted_at",
                    "responded_at",
                    "settled_at",
                    "created_by",
                    "rejection_reason",
                    "notes",
                ),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(EligibilityCheck)
class EligibilityCheckAdmin(admin.ModelAdmin):
    list_display = [
        "policy",
        "is_eligible",
        "scheme_returned",
        "member_status",
        "checked_by",
        "checked_at",
    ]
    list_filter = ["is_eligible", "checked_at"]
    search_fields = ["scheme_returned", "member_status", "policy__member_number"]
    raw_id_fields = ["policy", "checked_by"]
    readonly_fields = ["checked_at"]
    date_hierarchy = "checked_at"