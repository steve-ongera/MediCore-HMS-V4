from django.contrib import admin

from .models import (
    AntenatalProfile, ANCVisit, DeliveryRecord, DeliveryCharge, Child, PostnatalVisit,
    VaccineCatalog, ChildImmunization, GrowthMonitoring,
)


class ANCVisitInline(admin.TabularInline):
    model = ANCVisit
    extra = 0


class DeliveryRecordInline(admin.TabularInline):
    model = DeliveryRecord
    extra = 0


class DeliveryChargeInline(admin.TabularInline):
    model = DeliveryCharge
    extra = 0
    fields = ["invoice", "description", "added_by", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(AntenatalProfile)
class AntenatalProfileAdmin(admin.ModelAdmin):
    list_display = ["anc_number", "mother", "gravida", "para", "edd", "status", "high_risk"]
    list_filter = ["status", "high_risk", "blood_group"]
    search_fields = ["anc_number", "mother__full_name", "mother__hospital_number"]
    inlines = [ANCVisitInline, DeliveryRecordInline]


@admin.register(DeliveryRecord)
class DeliveryRecordAdmin(admin.ModelAdmin):
    list_display = ["delivery_number", "profile", "delivery_date", "mode_of_delivery", "outcome"]
    list_filter = ["mode_of_delivery", "outcome"]
    search_fields = ["delivery_number", "profile__mother__full_name"]
    inlines = [DeliveryChargeInline]


@admin.register(DeliveryCharge)
class DeliveryChargeAdmin(admin.ModelAdmin):
    list_display = ["delivery", "description", "invoice", "added_by", "created_at"]
    search_fields = ["delivery__delivery_number", "description", "invoice__invoice_number"]


@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = ["child_number", "mother", "full_name", "sex", "date_of_birth"]
    search_fields = ["child_number", "full_name", "mother__full_name"]


@admin.register(PostnatalVisit)
class PostnatalVisitAdmin(admin.ModelAdmin):
    list_display = ["profile", "visit_day", "child", "visit_date"]
    search_fields = ["profile__mother__full_name"]


@admin.register(VaccineCatalog)
class VaccineCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "recommended_age_weeks", "price", "is_active"]
    search_fields = ["code", "name"]


@admin.register(ChildImmunization)
class ChildImmunizationAdmin(admin.ModelAdmin):
    list_display = ["child", "vaccine", "status", "due_date", "given_date"]
    list_filter = ["status"]
    search_fields = ["child__child_number", "vaccine__name"]


@admin.register(GrowthMonitoring)
class GrowthMonitoringAdmin(admin.ModelAdmin):
    list_display = ["child", "weight_kg", "height_cm", "nutrition_status", "recorded_at"]
    search_fields = ["child__child_number"]