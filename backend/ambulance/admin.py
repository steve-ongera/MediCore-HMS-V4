from django.contrib import admin

from .models import (
    Ambulance, AmbulanceCrewMember, AmbulanceDispatch, DispatchCrewMember, AmbulanceMaintenanceLog,
)


class CrewInline(admin.TabularInline):
    model = AmbulanceCrewMember
    extra = 0


class DispatchCrewInline(admin.TabularInline):
    model = DispatchCrewMember
    extra = 0


@admin.register(Ambulance)
class AmbulanceAdmin(admin.ModelAdmin):
    list_display = ["registration_number", "ambulance_type", "status", "base_fee", "rate_per_km", "is_active"]
    list_filter = ["ambulance_type", "status"]
    search_fields = ["registration_number"]
    inlines = [CrewInline]


@admin.register(AmbulanceDispatch)
class AmbulanceDispatchAdmin(admin.ModelAdmin):
    list_display = ["dispatch_number", "patient_display_name", "ambulance", "status", "dispatch_type", "requested_at"]
    list_filter = ["status", "dispatch_type"]
    search_fields = ["dispatch_number", "patient__full_name", "patient_name_freetext"]
    inlines = [DispatchCrewInline]


@admin.register(AmbulanceMaintenanceLog)
class AmbulanceMaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ["ambulance", "maintenance_type", "service_date", "cost"]