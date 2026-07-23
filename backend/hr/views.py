from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin
from api.permissions import IsHROfficer

from .models import (
    Employee, EmploymentStatus, LeaveType, LeaveRequest, LeaveStatus,
    Attendance, PayrollRun, PayrollRunStatus, Payslip,
    PerformanceReview, DisciplinaryRecord,
)
from .serializers import (
    EmployeeSerializer, EmployeeListSerializer, LeaveTypeSerializer,
    LeaveRequestSerializer, RejectLeaveSerializer, AttendanceSerializer,
    PayrollRunSerializer, PayrollRunListSerializer, PayslipSerializer,
    GeneratePayrollSerializer, PerformanceReviewSerializer, DisciplinaryRecordSerializer,
)


class EmployeeViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = Employee.objects.select_related("department", "user").all()
    filterset_fields = ["department", "employment_status", "employment_type"]
    search_fields = ["employee_number", "full_name", "national_id", "phone"]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(employment_status=EmploymentStatus.ACTIVE)
        return Response(EmployeeListSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="terminate")
    def terminate(self, request, pk=None):
        employee = self.get_object()
        employee.employment_status = EmploymentStatus.TERMINATED
        employee.date_terminated = request.data.get("date_terminated") or date.today()
        employee.save(update_fields=["employment_status", "date_terminated"])
        return Response(EmployeeSerializer(employee).data)


class LeaveTypeViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = LeaveType.objects.filter(is_active=True)
    serializer_class = LeaveTypeSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name"]


class LeaveRequestViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = LeaveRequest.objects.select_related("employee", "leave_type").all()
    serializer_class = LeaveRequestSerializer
    filterset_fields = ["employee", "leave_type", "status"]

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveStatus.PENDING:
            raise ValidationError({"detail": "Only pending leave requests can be approved."})
        leave.status = LeaveStatus.APPROVED
        leave.approved_by = request.user
        leave.approved_at = timezone.now()
        leave.save(update_fields=["status", "approved_by", "approved_at"])

        employee = leave.employee
        today = date.today()
        if leave.start_date <= today <= leave.end_date:
            employee.employment_status = EmploymentStatus.ON_LEAVE
            employee.save(update_fields=["employment_status"])

        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveStatus.PENDING:
            raise ValidationError({"detail": "Only pending leave requests can be rejected."})
        serializer = RejectLeaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave.status = LeaveStatus.REJECTED
        leave.rejection_reason = serializer.validated_data["rejection_reason"]
        leave.save(update_fields=["status", "rejection_reason"])
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        qs = self.get_queryset().filter(status=LeaveStatus.PENDING)
        return Response(LeaveRequestSerializer(qs, many=True).data)


class AttendanceViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = Attendance.objects.select_related("employee").all()
    serializer_class = AttendanceSerializer
    filterset_fields = ["employee", "date", "status"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        qs = self.get_queryset().filter(date=date.today())
        return Response(AttendanceSerializer(qs, many=True).data)


class PayrollRunViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = PayrollRun.objects.prefetch_related("payslips__employee").all()
    filterset_fields = ["status", "period_year"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return PayrollRunListSerializer
        return PayrollRunSerializer

    def create(self, request, *args, **kwargs):
        """
        Generates a draft payroll run: one Payslip per ACTIVE employee, seeded
        from Employee.basic_salary with zero allowances/deductions. Accountant
        edits individual payslips afterward (via PayslipViewSet) before marking
        the run PROCESSED.
        """
        serializer = GeneratePayrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if PayrollRun.objects.filter(period_month=data["period_month"], period_year=data["period_year"]).exists():
            raise ValidationError({"detail": "A payroll run already exists for this period."})

        with transaction.atomic():
            run = PayrollRun.objects.create(period_month=data["period_month"], period_year=data["period_year"])
            employees = Employee.objects.filter(employment_status__in=[EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE])
            for emp in employees:
                Payslip.objects.create(payroll_run=run, employee=emp, basic_salary=emp.basic_salary)

        return Response(PayrollRunSerializer(run).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="process")
    def process(self, request, pk=None):
        run = self.get_object()
        if run.status != PayrollRunStatus.DRAFT:
            raise ValidationError({"detail": "Only draft payroll runs can be processed."})
        run.status = PayrollRunStatus.PROCESSED
        run.processed_by = request.user
        run.processed_at = timezone.now()
        run.save(update_fields=["status", "processed_by", "processed_at"])
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        run = self.get_object()
        if run.status != PayrollRunStatus.PROCESSED:
            raise ValidationError({"detail": "Only processed payroll runs can be marked paid."})
        run.status = PayrollRunStatus.PAID
        run.save(update_fields=["status"])
        return Response(PayrollRunSerializer(run).data)


class PayslipViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = Payslip.objects.select_related("employee", "payroll_run").all()
    serializer_class = PayslipSerializer
    filterset_fields = ["payroll_run", "employee"]
    http_method_names = ["get", "patch", "head", "options"]  # created only via PayrollRunViewSet.create

    def perform_update(self, serializer):
        payroll_run = serializer.instance.payroll_run
        if payroll_run.status != PayrollRunStatus.DRAFT:
            raise ValidationError({"detail": "Cannot edit a payslip once its payroll run is processed."})
        serializer.save()


class PerformanceReviewViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = PerformanceReview.objects.select_related("employee", "reviewer").all()
    serializer_class = PerformanceReviewSerializer
    filterset_fields = ["employee"]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)


class DisciplinaryRecordViewSet(BaseModelViewSet):
    permission_classes = [IsHROfficer]
    queryset = DisciplinaryRecord.objects.select_related("employee").all()
    serializer_class = DisciplinaryRecordSerializer
    filterset_fields = ["employee", "severity"]

    def perform_create(self, serializer):
        serializer.save(issued_by=self.request.user)