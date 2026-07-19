"""
Seed realistic data for the hr app.

Deliberately does NOT create Department rows — it fetches whatever
Departments already exist (from api.models.Department) and attaches
employees/records to those. If no departments exist, it aborts and tells
you to seed api/Department data first.

It WILL create api.models.User accounts for a subset of employees (so some
employees have login access, matching the Employee.user nullable design),
but only for HR-appropriate roles (NURSE, DOCTOR, ACCOUNTANT, etc.) — it
does not touch Department.

Usage:
    python manage.py seed_hr
    python manage.py seed_hr --employees 40
    python manage.py seed_hr --employees 40 --with-login-ratio 0.3
    python manage.py seed_hr --clear   # wipes hr app data before reseeding

Place this file at: hr/management/commands/seed_hr.py
(create empty __init__.py files in hr/management/ and hr/management/commands/
if they don't already exist)
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Department, Role, User
from hr.models import (
    Attendance,
    AttendanceStatus,
    DisciplinaryRecord,
    DisciplinarySeverity,
    Employee,
    EmploymentStatus,
    EmploymentType,
    Gender,
    LeaveRequest,
    LeaveStatus,
    LeaveType,
    PayrollRun,
    PayrollRunStatus,
    Payslip,
    PerformanceReview,
)

FIRST_NAMES_M = [
    "Brian", "Kevin", "Dennis", "Peter", "James", "John", "Samuel", "Kelvin",
    "Victor", "Erick", "Collins", "Felix", "George", "Anthony", "Moses",
    "Stephen", "Patrick", "Joseph", "Vincent", "Daniel",
]
FIRST_NAMES_F = [
    "Faith", "Mercy", "Grace", "Joyce", "Esther", "Purity", "Winnie", "Ann",
    "Caroline", "Diana", "Brenda", "Lilian", "Sharon", "Beatrice", "Alice",
    "Catherine", "Nancy", "Irene", "Millicent", "Josephine",
]
LAST_NAMES = [
    "Otieno", "Kariuki", "Mwangi", "Njoroge", "Wanjiru", "Kiptoo", "Cheruiyot",
    "Achieng", "Odhiambo", "Kamau", "Wafula", "Barasa", "Mutua", "Njeri",
    "Waweru", "Korir", "Chebet", "Muthoni", "Onyango", "Simiyu",
]

JOB_TITLES = [
    "Nurse", "Clinical Officer", "Medical Doctor", "Lab Technologist",
    "Radiographer", "Pharmacist", "Pharmacy Technician", "Accountant",
    "Receptionist", "Cashier", "Records Officer", "Security Officer",
    "Groundskeeper", "Driver", "Cleaner", "ICT Support",
]

# Only these job titles get a linked login (User + Employee.user), matching
# roles that actually exist on api.models.Role.
LOGIN_ROLE_MAP = {
    "Nurse": Role.NURSE,
    "Medical Doctor": Role.DOCTOR,
    "Lab Technologist": Role.LAB_TECHNOLOGIST,
    "Radiographer": Role.RADIOLOGIST,
    "Pharmacist": Role.PHARMACIST,
    "Accountant": Role.ACCOUNTANT,
    "Receptionist": Role.RECEPTIONIST,
    "Cashier": Role.CASHIER,
}

DEFAULT_LEAVE_TYPES = [
    {"name": "Annual Leave", "default_days_per_year": 21, "is_paid": True},
    {"name": "Sick Leave", "default_days_per_year": 14, "is_paid": True},
    {"name": "Maternity Leave", "default_days_per_year": 90, "is_paid": True},
    {"name": "Paternity Leave", "default_days_per_year": 14, "is_paid": True},
    {"name": "Compassionate Leave", "default_days_per_year": 5, "is_paid": True},
    {"name": "Unpaid Leave", "default_days_per_year": 0, "is_paid": False},
]

BANKS = ["Equity Bank", "KCB", "Co-operative Bank", "NCBA", "ABSA Kenya", "Family Bank"]


def random_phone():
    return f"07{random.randint(10000000, 99999999)}"


def random_national_id():
    return str(random.randint(20000000, 39999999))


def random_full_name():
    if random.random() < 0.5:
        first = random.choice(FIRST_NAMES_M)
        gender = Gender.MALE
    else:
        first = random.choice(FIRST_NAMES_F)
        gender = Gender.FEMALE
    last = random.choice(LAST_NAMES)
    return f"{first} {last}", gender


class Command(BaseCommand):
    help = "Seed hr app data (employees, leave, attendance, payroll, reviews, discipline) using existing Departments."

    def add_arguments(self, parser):
        parser.add_argument("--employees", type=int, default=25, help="Number of employees to create.")
        parser.add_argument(
            "--with-login-ratio", type=float, default=0.4,
            help="Fraction of eligible employees (0-1) that also get a linked User login.",
        )
        parser.add_argument("--clear", action="store_true", help="Delete existing hr app rows before seeding.")

    def handle(self, *args, **options):
        num_employees = options["employees"]
        login_ratio = options["with_login_ratio"]
        clear = options["clear"]

        departments = list(Department.objects.filter(is_active=True))
        if not departments:
            self.stderr.write(self.style.ERROR(
                "No Department rows found. Seed api/Department data first — this command "
                "will not create departments."
            ))
            return

        with transaction.atomic():
            if clear:
                self._clear()

            leave_types = self._seed_leave_types()
            employees = self._seed_employees(num_employees, departments, login_ratio)
            self._seed_leave_requests(employees, leave_types)
            self._seed_attendance(employees)
            self._seed_payroll(employees)
            self._seed_performance_reviews(employees)
            self._seed_disciplinary_records(employees)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(employees)} employees across {len(departments)} existing departments."
        ))

    # ------------------------------------------------------------------
    def _clear(self):
        DisciplinaryRecord.objects.all().delete()
        PerformanceReview.objects.all().delete()
        Payslip.objects.all().delete()
        PayrollRun.objects.all().delete()
        Attendance.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Employee.objects.all().delete()
        LeaveType.objects.all().delete()
        self.stdout.write("Cleared existing hr app data.")

    # ------------------------------------------------------------------
    def _seed_leave_types(self):
        leave_types = []
        for lt in DEFAULT_LEAVE_TYPES:
            obj, _ = LeaveType.objects.get_or_create(
                name=lt["name"],
                defaults={
                    "default_days_per_year": lt["default_days_per_year"],
                    "is_paid": lt["is_paid"],
                },
            )
            leave_types.append(obj)
        return leave_types

    # ------------------------------------------------------------------
    def _seed_employees(self, num_employees, departments, login_ratio):
        employees = []
        used_ids = set()
        used_usernames = set(User.objects.values_list("username", flat=True))

        for i in range(num_employees):
            full_name, gender = random_full_name()
            job_title = random.choice(JOB_TITLES)
            department = random.choice(departments)

            national_id = random_national_id()
            while national_id in used_ids:
                national_id = random_national_id()
            used_ids.add(national_id)

            date_hired = date.today() - timedelta(days=random.randint(30, 365 * 8))
            employment_status = random.choices(
                [EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE,
                 EmploymentStatus.SUSPENDED, EmploymentStatus.RESIGNED],
                weights=[80, 8, 4, 8],
            )[0]
            date_terminated = None
            if employment_status == EmploymentStatus.RESIGNED:
                date_terminated = date_hired + timedelta(days=random.randint(90, 2000))

            basic_salary = Decimal(random.choice([
                25000, 30000, 35000, 45000, 55000, 65000, 80000, 95000, 120000, 180000,
            ]))

            user = None
            role = LOGIN_ROLE_MAP.get(job_title)
            if role and random.random() < login_ratio:
                username = self._unique_username(full_name, used_usernames)
                user = User.objects.create_user(
                    username=username,
                    email=f"{username}@hospital.local",
                    password="ChangeMe123!",
                    first_name=full_name.split(" ")[0],
                    last_name=full_name.split(" ")[-1],
                    role=role,
                    department=department,
                    phone=random_phone(),
                )

            employee = Employee.objects.create(
                user=user,
                full_name=full_name,
                national_id=national_id,
                gender=gender,
                date_of_birth=date.today() - timedelta(days=random.randint(365 * 22, 365 * 60)),
                phone=random_phone(),
                email=f"{full_name.lower().replace(' ', '.')}@hospital.local",
                address=f"P.O. Box {random.randint(100, 9999)}, Nairobi",
                job_title=job_title,
                department=department,
                employment_type=random.choices(
                    [EmploymentType.FULL_TIME, EmploymentType.PART_TIME,
                     EmploymentType.CONTRACT, EmploymentType.LOCUM, EmploymentType.INTERN],
                    weights=[65, 10, 10, 10, 5],
                )[0],
                employment_status=employment_status,
                date_hired=date_hired,
                date_terminated=date_terminated,
                basic_salary=basic_salary,
                bank_name=random.choice(BANKS),
                bank_account_number=str(random.randint(1000000000, 9999999999)),
                next_of_kin_name=random_full_name()[0],
                next_of_kin_phone=random_phone(),
                next_of_kin_relationship=random.choice(["Spouse", "Parent", "Sibling", "Child"]),
            )
            employees.append(employee)

        return employees

    @staticmethod
    def _unique_username(full_name, used_usernames):
        base = full_name.lower().replace(" ", ".")
        username = base
        n = 1
        while username in used_usernames:
            n += 1
            username = f"{base}{n}"
        used_usernames.add(username)
        return username

    # ------------------------------------------------------------------
    def _seed_leave_requests(self, employees, leave_types):
        for employee in employees:
            for _ in range(random.randint(0, 3)):
                leave_type = random.choice(leave_types)
                start_date = date.today() - timedelta(days=random.randint(-60, 180))
                end_date = start_date + timedelta(days=random.randint(1, 10))
                status = random.choices(
                    [LeaveStatus.PENDING, LeaveStatus.APPROVED,
                     LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
                    weights=[20, 60, 10, 10],
                )[0]

                approved_by, approved_at, rejection_reason = None, None, ""
                if status == LeaveStatus.APPROVED:
                    approved_at = timezone.make_aware(
                        datetime.combine(start_date - timedelta(days=random.randint(1, 5)), time(9, 0))
                    )
                elif status == LeaveStatus.REJECTED:
                    rejection_reason = random.choice([
                        "Insufficient staffing for the requested period.",
                        "Leave balance exhausted for the year.",
                        "Conflicts with another approved leave in the department.",
                    ])

                LeaveRequest.objects.create(
                    employee=employee,
                    leave_type=leave_type,
                    start_date=start_date,
                    end_date=end_date,
                    reason=random.choice([
                        "Family matters", "Medical appointment", "Rest and recovery",
                        "Travel", "Personal reasons",
                    ]),
                    status=status,
                    approved_by=approved_by,
                    approved_at=approved_at,
                    rejection_reason=rejection_reason,
                )

    # ------------------------------------------------------------------
    def _seed_attendance(self, employees):
        today = date.today()
        for employee in employees:
            if employee.employment_status == EmploymentStatus.TERMINATED:
                continue
            for days_ago in range(30):
                day = today - timedelta(days=days_ago)
                if day.weekday() >= 5:  # skip weekends
                    continue
                status = random.choices(
                    [AttendanceStatus.PRESENT, AttendanceStatus.LATE,
                     AttendanceStatus.ABSENT, AttendanceStatus.HALF_DAY],
                    weights=[75, 12, 5, 8],
                )[0]

                clock_in, clock_out = None, None
                if status == AttendanceStatus.PRESENT:
                    clock_in = time(random.randint(7, 8), random.randint(0, 59))
                    clock_out = time(random.randint(16, 18), random.randint(0, 59))
                elif status == AttendanceStatus.LATE:
                    clock_in = time(random.randint(9, 11), random.randint(0, 59))
                    clock_out = time(random.randint(16, 18), random.randint(0, 59))
                elif status == AttendanceStatus.HALF_DAY:
                    clock_in = time(random.randint(7, 9), random.randint(0, 59))
                    clock_out = time(random.randint(12, 13), random.randint(0, 59))

                Attendance.objects.get_or_create(
                    employee=employee,
                    date=day,
                    defaults={
                        "clock_in": clock_in,
                        "clock_out": clock_out,
                        "status": status,
                    },
                )

    # ------------------------------------------------------------------
    def _seed_payroll(self, employees):
        today = date.today()
        for months_back in range(3):
            month_date = (today.replace(day=1) - timedelta(days=months_back * 30)).replace(day=1)
            payroll_run, created = PayrollRun.objects.get_or_create(
                period_month=month_date.month,
                period_year=month_date.year,
                defaults={"status": PayrollRunStatus.PAID if months_back > 0 else PayrollRunStatus.PROCESSED},
            )
            for employee in employees:
                if employee.employment_status == EmploymentStatus.TERMINATED:
                    continue
                basic = employee.basic_salary
                allowances = (basic * Decimal("0.10")).quantize(Decimal("0.01"))
                overtime = Decimal(random.choice([0, 0, 0, 1500, 3000, 5000]))

                gross = basic + allowances + overtime
                paye = self._estimate_paye(gross)
                nssf = min(gross * Decimal("0.06"), Decimal("2160")).quantize(Decimal("0.01"))
                nhif = self._estimate_nhif(gross)
                other_deductions = Decimal(random.choice([0, 0, 500, 1000]))

                Payslip.objects.get_or_create(
                    payroll_run=payroll_run,
                    employee=employee,
                    defaults={
                        "basic_salary": basic,
                        "allowances": allowances,
                        "overtime": overtime,
                        "paye_tax": paye,
                        "nhif_deduction": nhif,
                        "nssf_deduction": nssf,
                        "other_deductions": other_deductions,
                    },
                )

    @staticmethod
    def _estimate_paye(gross):
        # Simplified progressive estimate — not a compliance-grade PAYE calc.
        gross = float(gross)
        if gross <= 24000:
            tax = gross * 0.10
        elif gross <= 32333:
            tax = 24000 * 0.10 + (gross - 24000) * 0.25
        else:
            tax = 24000 * 0.10 + 8333 * 0.25 + (gross - 32333) * 0.30
        relief = 2400
        return Decimal(max(tax - relief, 0)).quantize(Decimal("0.01"))

    @staticmethod
    def _estimate_nhif(gross):
        gross = float(gross)
        brackets = [
            (5999, 150), (7999, 300), (11999, 400), (14999, 500),
            (19999, 600), (24999, 750), (29999, 850), (34999, 900),
            (39999, 950), (44999, 1000), (49999, 1100), (59999, 1200),
            (69999, 1300), (79999, 1400), (89999, 1500), (99999, 1600),
        ]
        for cap, amount in brackets:
            if gross <= cap:
                return Decimal(amount)
        return Decimal(1700)

    # ------------------------------------------------------------------
    def _seed_performance_reviews(self, employees):
        for employee in employees:
            if random.random() < 0.7:
                period_end = date.today() - timedelta(days=random.randint(1, 60))
                period_start = period_end - timedelta(days=180)
                PerformanceReview.objects.create(
                    employee=employee,
                    review_period_start=period_start,
                    review_period_end=period_end,
                    score=random.randint(55, 98),
                    strengths=random.choice([
                        "Reliable, punctual, and works well within the team.",
                        "Strong technical skills and attention to detail.",
                        "Good communicator with patients and colleagues.",
                    ]),
                    areas_for_improvement=random.choice([
                        "Could improve documentation timeliness.",
                        "Needs to attend more continuous professional development sessions.",
                        "Should delegate more effectively during peak periods.",
                    ]),
                    goals_next_period=random.choice([
                        "Complete a relevant certification.",
                        "Reduce average patient wait time.",
                        "Mentor a new team member.",
                    ]),
                    employee_comments=random.choice([
                        "Agree with the feedback and will work on it.",
                        "Would appreciate more support staff during busy shifts.",
                        "",
                    ]),
                )

    # ------------------------------------------------------------------
    def _seed_disciplinary_records(self, employees):
        for employee in employees:
            if random.random() < 0.12:
                severity = random.choices(
                    [DisciplinarySeverity.VERBAL_WARNING, DisciplinarySeverity.WRITTEN_WARNING,
                     DisciplinarySeverity.FINAL_WARNING, DisciplinarySeverity.SUSPENSION],
                    weights=[50, 30, 12, 8],
                )[0]
                DisciplinaryRecord.objects.create(
                    employee=employee,
                    severity=severity,
                    incident_date=date.today() - timedelta(days=random.randint(1, 400)),
                    description=random.choice([
                        "Repeated late arrival to shift without notice.",
                        "Failure to follow documented clinical protocol.",
                        "Unprofessional conduct towards a colleague.",
                        "Unauthorized absence from duty.",
                    ]),
                    action_taken=random.choice([
                        "Verbal counselling conducted by supervisor.",
                        "Written warning issued and placed on file.",
                        "Referred to HR for further review.",
                    ]),
                )