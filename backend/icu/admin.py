from django.contrib import admin

from .models import (
    ICUBed, ICUAdmission, ICUVitalsMonitoring, VentilatorSettings,
    ICUProcedureCatalog, ICUProcedureRecord, ICUBedCharge,
)


class VitalsInline(admin.TabularInline):
    model = ICUVitalsMonitoring
    extra = 0


class VentilatorInline(admin.TabularInline):
    model = VentilatorSettings
    extra = 0


@admin.register(ICUBed)
class ICUBedAdmin(admin.ModelAdmin):
    list_display = ["bed_number", "unit_type", "daily_rate", "has_ventilator", "status"]


@admin.register(ICUAdmission)
class ICUAdmissionAdmin(admin.ModelAdmin):
    list_display = ["icu_admission_number", "patient", "bed", "admission_reason", "status", "admitted_at"]
    list_filter = ["status", "admission_reason"]
    search_fields = ["icu_admission_number", "patient__full_name"]
    inlines = [VitalsInline, VentilatorInline]


@admin.register(ICUProcedureCatalog)
class ICUProcedureCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "price", "is_active"]


admin.site.register(ICUBedCharge)