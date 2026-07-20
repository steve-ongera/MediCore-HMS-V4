from django.contrib import admin

from .models import (
    OperatingTheatre, SurgicalProcedureCatalog, SurgeryBooking, Surgery,
    SurgicalTeamMember, ConsumableUsage, PostOpNote,
)


class SurgicalTeamInline(admin.TabularInline):
    model = SurgicalTeamMember
    extra = 0


class ConsumableUsageInline(admin.TabularInline):
    model = ConsumableUsage
    extra = 0


@admin.register(OperatingTheatre)
class OperatingTheatreAdmin(admin.ModelAdmin):
    list_display = ["theatre_number", "hourly_rate", "status", "is_active"]


@admin.register(SurgicalProcedureCatalog)
class SurgicalProcedureCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "base_price", "estimated_duration_minutes", "is_active"]
    search_fields = ["code", "name"]


@admin.register(SurgeryBooking)
class SurgeryBookingAdmin(admin.ModelAdmin):
    list_display = ["booking_number", "patient", "procedure", "priority", "status", "requested_date"]
    list_filter = ["status", "priority"]
    search_fields = ["booking_number", "patient__full_name"]


@admin.register(Surgery)
class SurgeryAdmin(admin.ModelAdmin):
    list_display = ["booking", "theatre", "status", "outcome", "theatre_in_at"]
    inlines = [SurgicalTeamInline, ConsumableUsageInline]


admin.site.register(PostOpNote)