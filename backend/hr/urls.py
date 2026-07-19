from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet, LeaveTypeViewSet, LeaveRequestViewSet, AttendanceViewSet,
    PayrollRunViewSet, PayslipViewSet, PerformanceReviewViewSet, DisciplinaryRecordViewSet,
)

router = DefaultRouter()
router.register(r"employees", EmployeeViewSet, basename="employee")
router.register(r"leave-types", LeaveTypeViewSet, basename="leave-type")
router.register(r"leave-requests", LeaveRequestViewSet, basename="leave-request")
router.register(r"attendance", AttendanceViewSet, basename="attendance")
router.register(r"payroll-runs", PayrollRunViewSet, basename="payroll-run")
router.register(r"payslips", PayslipViewSet, basename="payslip")
router.register(r"performance-reviews", PerformanceReviewViewSet, basename="performance-review")
router.register(r"disciplinary-records", DisciplinaryRecordViewSet, basename="disciplinary-record")

urlpatterns = [path("", include(router.urls))]