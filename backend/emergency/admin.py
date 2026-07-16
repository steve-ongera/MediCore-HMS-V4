from django.contrib import admin

from .models import (
    EmergencyBay, EmergencyVisit, TriageVitals, EmergencyNote,
    EmergencyProcedureCatalog, EmergencyProcedure,
    EmergencyMedicationOrder, EmergencyMedicationAdministration, EmergencyBayCharge,
)


@admin.register(EmergencyBay)
class EmergencyBayAdmin(admin.ModelAdmin):
    list_display = ["bay_number", "zone", "hourly_rate", "status", "is_active"]
    list_filter = ["zone", "status"]


@admin.register(EmergencyVisit)
class EmergencyVisitAdmin(admin.ModelAdmin):
    list_display = ["visit_number", "patient", "bay", "triage_level", "status", "arrived_at"]
    list_filter = ["status", "triage_level", "arrival_mode"]
    search_fields = ["visit_number", "patient__full_name", "patient__hospital_number"]


@admin.register(EmergencyProcedureCatalog)
class EmergencyProcedureCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "price", "is_active"]
    search_fields = ["code", "name"]


admin.site.register(TriageVitals)
admin.site.register(EmergencyNote)
admin.site.register(EmergencyProcedure)
admin.site.register(EmergencyMedicationOrder)
admin.site.register(EmergencyMedicationAdministration)
admin.site.register(EmergencyBayCharge)