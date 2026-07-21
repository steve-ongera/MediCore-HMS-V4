from django.contrib import admin

from .models import (
    EyeProcedureCatalog, EyeVisit, EyeExamination, SpectaclePrescription,
    EyeTreatmentPlan, EyeProcedureRecord,
)


class TreatmentPlanInline(admin.TabularInline):
    model = EyeTreatmentPlan
    extra = 0


class SpectaclePrescriptionInline(admin.TabularInline):
    model = SpectaclePrescription
    extra = 0


@admin.register(EyeProcedureCatalog)
class EyeProcedureCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "price", "is_active"]
    search_fields = ["code", "name"]


@admin.register(EyeVisit)
class EyeVisitAdmin(admin.ModelAdmin):
    list_display = ["visit_number", "patient", "ophthalmologist", "visit_date"]
    search_fields = ["visit_number", "patient__full_name"]
    inlines = [SpectaclePrescriptionInline, TreatmentPlanInline]


admin.site.register(EyeExamination)
admin.site.register(EyeProcedureRecord)