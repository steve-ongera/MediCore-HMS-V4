from django.contrib import admin

from .models import (
    Employee, LeaveType, LeaveRequest, Attendance, PayrollRun, Payslip,
    PerformanceReview, DisciplinaryRecord,
)


class LeaveRequestInline(admin.TabularInline):
    model = LeaveRequest
    extra = 0


class PayslipInline(admin.TabularInline):
    model = Payslip
    extra = 0


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["employee_number", "full_name", "job_title", "department", "employment_status", "date_hired"]
    list_filter = ["employment_status", "employment_type", "department"]
    search_fields = ["employee_number", "full_name", "national_id"]
    inlines = [LeaveRequestInline]


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "default_days_per_year", "is_paid", "is_active"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "date", "clock_in", "clock_out", "status"]
    list_filter = ["status"]
    search_fields = ["employee__full_name"]


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ["period_month", "period_year", "status"]
    inlines = [PayslipInline]


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ["employee", "reviewer", "score", "review_period_start", "review_period_end"]


@admin.register(DisciplinaryRecord)
class DisciplinaryRecordAdmin(admin.ModelAdmin):
    list_display = ["employee", "severity", "incident_date", "issued_by"]
    list_filter = ["severity"]