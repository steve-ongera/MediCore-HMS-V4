from django.contrib import admin

from .models import (
    DentalProcedureCatalog, DentalVisit, ToothChart, DentalTreatmentPlan, DentalProcedureRecord,
)


class ToothChartInline(admin.TabularInline):
    model = ToothChart
    extra = 0


class TreatmentPlanInline(admin.TabularInline):
    model = DentalTreatmentPlan
    extra = 0


@admin.register(DentalProcedureCatalog)
class DentalProcedureCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "price", "is_active"]
    search_fields = ["code", "name"]


@admin.register(DentalVisit)
class DentalVisitAdmin(admin.ModelAdmin):
    list_display = ["visit_number", "patient", "dentist", "visit_date"]
    search_fields = ["visit_number", "patient__full_name"]
    inlines = [ToothChartInline, TreatmentPlanInline]


admin.site.register(DentalProcedureRecord)