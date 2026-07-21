from django.contrib import admin

from .models import DialysisMachine, DialysisPatientProfile, DialysisSession, VascularAccessCheck


class SessionInline(admin.TabularInline):
    model = DialysisSession
    extra = 0


class AccessCheckInline(admin.TabularInline):
    model = VascularAccessCheck
    extra = 0


@admin.register(DialysisMachine)
class DialysisMachineAdmin(admin.ModelAdmin):
    list_display = ["machine_number", "rate_per_session", "status", "is_active"]


@admin.register(DialysisPatientProfile)
class DialysisPatientProfileAdmin(admin.ModelAdmin):
    list_display = ["profile_number", "patient", "vascular_access_type", "status", "sessions_per_week"]
    search_fields = ["profile_number", "patient__full_name"]
    inlines = [SessionInline, AccessCheckInline]


@admin.register(DialysisSession)
class DialysisSessionAdmin(admin.ModelAdmin):
    list_display = ["session_number", "profile", "machine", "status", "scheduled_date"]
    list_filter = ["status"]