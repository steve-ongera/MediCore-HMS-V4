from datetime import date

from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Department


class EmploymentType(models.TextChoices):
    FULL_TIME = "FULL_TIME", "Full-Time"
    PART_TIME = "PART_TIME", "Part-Time"
    CONTRACT = "CONTRACT", "Contract"
    LOCUM = "LOCUM", "Locum"
    INTERN = "INTERN", "Intern"


class EmploymentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    SUSPENDED = "SUSPENDED", "Suspended"
    TERMINATED = "TERMINATED", "Terminated"
    RESIGNED = "RESIGNED", "Resigned"


class Gender(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"


class Employee(BaseModel):
    """
    HR profile — deliberately separate from api.User. Not every employee
    needs system login access (e.g. groundskeeper, security), and HR data
    (salary, ID number, next of kin) shouldn't live on the auth model.
    user is nullable and set only when this employee also has a login.
    """
    employee_number = models.CharField(max_length=30, unique=True, editable=False)
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="employee_profile")

    full_name = models.CharField(max_length=150)
    national_id = models.CharField(max_length=30, blank=True, unique=True, null=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)

    job_title = models.CharField(max_length=150)
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees")
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    employment_status = models.CharField(max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE)
    date_hired = models.DateField()
    date_terminated = models.DateField(null=True, blank=True)

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)

    next_of_kin_name = models.CharField(max_length=150, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    next_of_kin_relationship = models.CharField(max_length=50, blank=True)

    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="employees_registered")

    class Meta:
        db_table = "employees"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.employee_number:
            from .utils import generate_employee_number
            self.employee_number = generate_employee_number()
        super().save(*args, **kwargs)

    @property
    def years_of_service(self):
        end = self.date_terminated or date.today()
        return round((end - self.date_hired).days / 365.25, 1)

    def __str__(self):
        return f"{self.employee_number} - {self.full_name}"


class LeaveType(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    default_days_per_year = models.PositiveSmallIntegerField(default=21)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "leave_types"

    def __str__(self):
        return self.name


class LeaveStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"


class LeaveRequest(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="requests")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="leave_requests_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        db_table = "leave_requests"
        ordering = ["-created_at"]

    @property
    def days_requested(self):
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} ({self.start_date} to {self.end_date})"


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    LATE = "LATE", "Late"
    ABSENT = "ABSENT", "Absent"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    HALF_DAY = "HALF_DAY", "Half Day"


class Attendance(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    clock_in = models.TimeField(null=True, blank=True)
    clock_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    notes = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="attendance_recorded")

    class Meta:
        db_table = "attendance_records"
        unique_together = ("employee", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.status})"


class PayrollRunStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PROCESSED = "PROCESSED", "Processed"
    PAID = "PAID", "Paid"


class PayrollRun(BaseModel):
    """One row per calendar month payroll cycle."""
    period_month = models.PositiveSmallIntegerField()
    period_year = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=PayrollRunStatus.choices, default=PayrollRunStatus.DRAFT)
    processed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="payroll_runs_processed")
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "payroll_runs"
        unique_together = ("period_month", "period_year")
        ordering = ["-period_year", "-period_month"]

    @property
    def total_net_pay(self):
        return sum((p.net_pay for p in self.payslips.all()), start=0)

    def __str__(self):
        return f"Payroll {self.period_month}/{self.period_year} ({self.status})"


class Payslip(BaseModel):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="payslips")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payslips")

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0, editable=False)

    paye_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nhif_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nssf_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0, editable=False)

    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0, editable=False)

    class Meta:
        db_table = "payslips"
        unique_together = ("payroll_run", "employee")

    def save(self, *args, **kwargs):
        self.gross_pay = self.basic_salary + self.allowances + self.overtime
        self.total_deductions = self.paye_tax + self.nhif_deduction + self.nssf_deduction + self.other_deductions
        self.net_pay = self.gross_pay - self.total_deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.full_name} - {self.payroll_run}"


class PerformanceReview(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="performance_reviews")
    reviewer = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="performance_reviews_conducted")
    review_period_start = models.DateField()
    review_period_end = models.DateField()
    score = models.PositiveSmallIntegerField(help_text="Overall score out of 100.")
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    goals_next_period = models.TextField(blank=True)
    employee_comments = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "performance_reviews"
        ordering = ["-reviewed_at"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.review_period_start} to {self.review_period_end}"


class DisciplinarySeverity(models.TextChoices):
    VERBAL_WARNING = "VERBAL_WARNING", "Verbal Warning"
    WRITTEN_WARNING = "WRITTEN_WARNING", "Written Warning"
    FINAL_WARNING = "FINAL_WARNING", "Final Warning"
    SUSPENSION = "SUSPENSION", "Suspension"
    TERMINATION = "TERMINATION", "Termination"


class DisciplinaryRecord(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="disciplinary_records")
    severity = models.CharField(max_length=20, choices=DisciplinarySeverity.choices)
    incident_date = models.DateField()
    description = models.TextField()
    action_taken = models.TextField(blank=True)
    issued_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="disciplinary_records_issued")
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "disciplinary_records"
        ordering = ["-incident_date"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.severity} ({self.incident_date})"