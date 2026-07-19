from rest_framework import serializers

from .models import (
    Employee, LeaveType, LeaveRequest, Attendance, PayrollRun, Payslip,
    PerformanceReview, DisciplinaryRecord,
)


class LeaveTypeSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = LeaveType
        fields = ["id", "name", "default_days_per_year", "is_paid", "requires_approval", "is_active"]


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    days_requested = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_name", "leave_type", "leave_type_name",
            "start_date", "end_date", "days_requested", "reason", "status",
            "approved_by", "approved_by_name", "approved_at", "rejection_reason", "created_at",
        ]
        read_only_fields = ["id", "status", "approved_by", "approved_at", "created_at"]


class RejectLeaveSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField()


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "employee", "employee_name", "date", "clock_in", "clock_out", "status", "notes", "recorded_by"]
        read_only_fields = ["id", "recorded_by"]


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_number = serializers.CharField(source="employee.employee_number", read_only=True)

    class Meta:
        model = Payslip
        fields = [
            "id", "payroll_run", "employee", "employee_name", "employee_number",
            "basic_salary", "allowances", "overtime", "gross_pay",
            "paye_tax", "nhif_deduction", "nssf_deduction", "other_deductions",
            "total_deductions", "net_pay",
        ]
        read_only_fields = ["id", "gross_pay", "total_deductions", "net_pay"]


class PayrollRunSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.CharField(source="processed_by.get_full_name", read_only=True)
    payslips = PayslipSerializer(many=True, read_only=True)
    total_net_pay = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = [
            "id", "period_month", "period_year", "status", "processed_by",
            "processed_by_name", "processed_at", "notes", "payslips", "total_net_pay",
        ]
        read_only_fields = ["id", "status", "processed_by", "processed_at"]

    def get_total_net_pay(self, obj):
        return str(obj.total_net_pay)


class PayrollRunListSerializer(serializers.ModelSerializer):
    total_net_pay = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = ["id", "period_month", "period_year", "status", "total_net_pay", "employee_count"]

    def get_total_net_pay(self, obj):
        return str(obj.total_net_pay)

    def get_employee_count(self, obj):
        return obj.payslips.count()


class GeneratePayrollSerializer(serializers.Serializer):
    period_month = serializers.IntegerField(min_value=1, max_value=12)
    period_year = serializers.IntegerField(min_value=2020)


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.get_full_name", read_only=True)

    class Meta:
        model = PerformanceReview
        fields = [
            "id", "employee", "employee_name", "reviewer", "reviewer_name",
            "review_period_start", "review_period_end", "score", "strengths",
            "areas_for_improvement", "goals_next_period", "employee_comments", "reviewed_at",
        ]
        read_only_fields = ["id", "reviewer", "reviewed_at"]


class DisciplinaryRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.get_full_name", read_only=True)

    class Meta:
        model = DisciplinaryRecord
        fields = [
            "id", "employee", "employee_name", "severity", "incident_date",
            "description", "action_taken", "issued_by", "issued_by_name", "created_at_display",
        ]
        read_only_fields = ["id", "issued_by", "created_at_display"]


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    years_of_service = serializers.FloatField(read_only=True)

    leave_requests = LeaveRequestSerializer(many=True, read_only=True)
    performance_reviews = PerformanceReviewSerializer(many=True, read_only=True)
    disciplinary_records = DisciplinaryRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "employee_number", "user", "user_username", "full_name", "national_id",
            "gender", "date_of_birth", "phone", "email", "address", "job_title",
            "department", "department_name", "employment_type", "employment_status",
            "date_hired", "date_terminated", "years_of_service", "basic_salary",
            "bank_name", "bank_account_number", "next_of_kin_name", "next_of_kin_phone",
            "next_of_kin_relationship", "registered_by",
            "leave_requests", "performance_reviews", "disciplinary_records", "created_at",
        ]
        read_only_fields = ["id", "employee_number", "registered_by", "created_at"]


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "employee_number", "full_name", "job_title", "department_name",
            "employment_type", "employment_status", "date_hired", "phone",
        ]