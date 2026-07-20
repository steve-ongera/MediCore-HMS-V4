"""
Management command: seed_finance

Seeds demo data for the finance app: a chart of Accounts, FiscalPeriods,
balanced JournalEntries (+ lines), ExpenseCategories, Expenses, and
department Budgets.

Reuses existing Departments/Users where available (Accountant role for
posting entries, any role for expense submission/approval); creates
fallback Departments/staff only for whatever is missing, same pattern as
the theatre seed command.

Place at: finance/management/commands/seed_finance.py
(remember the two empty __init__.py files under
finance/management/ and finance/management/commands/)

Usage:
    python manage.py seed_finance
    python manage.py seed_finance --flush   # wipe previously seeded rows first
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import User, Role, Department

from finance.models import (
    Account,
    AccountType,
    FiscalPeriod,
    JournalEntry,
    JournalEntryLine,
    JournalEntryStatus,
    JournalEntrySource,
    ExpenseCategory,
    Expense,
    ExpenseStatus,
    Budget,
)


SEED_TAG = "SEED-FINANCE"


# ---------------------------------------------------------------------------
# Raw seed data
# ---------------------------------------------------------------------------

# (code, name, account_type, parent_code_or_None)
ACCOUNTS_DATA = [
    ("1000", "Assets", AccountType.ASSET, None),
    ("1010", "Cash and Bank", AccountType.ASSET, "1000"),
    ("1020", "Accounts Receivable - Patients", AccountType.ASSET, "1000"),
    ("1030", "Inventory - Pharmacy", AccountType.ASSET, "1000"),

    ("2000", "Liabilities", AccountType.LIABILITY, None),
    ("2010", "Accounts Payable - Suppliers", AccountType.LIABILITY, "2000"),
    ("2020", "Accrued Payroll", AccountType.LIABILITY, "2000"),

    ("3000", "Equity", AccountType.EQUITY, None),
    ("3010", "Owner's Capital", AccountType.EQUITY, "3000"),
    ("3020", "Retained Earnings", AccountType.EQUITY, "3000"),

    ("4000", "Revenue", AccountType.REVENUE, None),
    ("4010", "Consultation Revenue", AccountType.REVENUE, "4000"),
    ("4020", "Laboratory Revenue", AccountType.REVENUE, "4000"),
    ("4030", "Radiology Revenue", AccountType.REVENUE, "4000"),
    ("4040", "Pharmacy Revenue", AccountType.REVENUE, "4000"),
    ("4050", "Procedure / Theatre Revenue", AccountType.REVENUE, "4000"),
    ("4060", "Inpatient Revenue", AccountType.REVENUE, "4000"),

    ("5000", "Expenses", AccountType.EXPENSE, None),
    ("5010", "Salaries and Wages", AccountType.EXPENSE, "5000"),
    ("5020", "Medical Supplies", AccountType.EXPENSE, "5000"),
    ("5030", "Utilities", AccountType.EXPENSE, "5000"),
    ("5040", "Rent", AccountType.EXPENSE, "5000"),
    ("5050", "Equipment Maintenance", AccountType.EXPENSE, "5000"),
    ("5060", "Administrative Expenses", AccountType.EXPENSE, "5000"),
]

# (name, default_account_code)
EXPENSE_CATEGORIES_DATA = [
    ("Utilities", "5030"),
    ("Rent", "5040"),
    ("Medical Supplies", "5020"),
    ("Equipment Maintenance", "5050"),
    ("Administrative", "5060"),
]

FALLBACK_DEPARTMENTS = [
    dict(name="General Medicine", consultation_fee=1500),
    dict(name="Laboratory", consultation_fee=0),
    dict(name="Radiology", consultation_fee=0),
    dict(name="Pharmacy", consultation_fee=0),
    dict(name="Administration", consultation_fee=0),
]

FALLBACK_STAFF = [
    dict(username="seed_accountant_kariuki", first_name="Susan", last_name="Kariuki",
         role=Role.ACCOUNTANT, email="accountant.kariuki@example.com"),
    dict(username="seed_accountant_omondi", first_name="David", last_name="Omondi",
         role=Role.ACCOUNTANT, email="accountant.omondi@example.com"),
]


class Command(BaseCommand):
    help = "Seed the finance module with a chart of accounts, journal entries, expenses, and budgets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete previously seeded finance records before reseeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        with transaction.atomic():
            accountants = self._seed_staff()
            departments = self._seed_departments()
            accounts = self._seed_accounts()
            fiscal_periods = self._seed_fiscal_periods()
            self._seed_expense_categories(accounts)
            self._seed_journal_entries(accounts, fiscal_periods, accountants)
            self._seed_expenses(departments, accountants, accounts)
            self._seed_budgets(departments, fiscal_periods, accountants)

        self.stdout.write(self.style.SUCCESS("Finance seed data created successfully."))

    # -- flush -------------------------------------------------------------

    def _flush(self):
        self.stdout.write("Flushing previously seeded finance data...")
        Budget.objects.filter(notes__startswith=SEED_TAG).delete()
        Expense.objects.filter(description__startswith=SEED_TAG).delete()
        JournalEntryLine.objects.filter(entry__description__startswith=SEED_TAG).delete()
        JournalEntry.objects.filter(description__startswith=SEED_TAG).delete()
        ExpenseCategory.objects.filter(name__in=[c[0] for c in EXPENSE_CATEGORIES_DATA]).delete()
        FiscalPeriod.objects.filter(name__startswith=SEED_TAG).delete()
        Account.objects.filter(code__in=[a[0] for a in ACCOUNTS_DATA]).delete()
        Department.objects.filter(name__in=[d["name"] for d in FALLBACK_DEPARTMENTS]).delete()
        User.objects.filter(username__in=[s["username"] for s in FALLBACK_STAFF]).delete()

    # -- supporting data -----------------------------------------------------

    def _seed_staff(self):
        accountants = list(User.objects.filter(role=Role.ACCOUNTANT, is_active_staff=True))

        if not accountants:
            self.stdout.write(self.style.WARNING(
                "  No existing Accountant users found; creating fallback staff."
            ))
            for data in FALLBACK_STAFF:
                user, created = User.objects.get_or_create(
                    username=data["username"],
                    defaults={
                        "first_name": data["first_name"],
                        "last_name": data["last_name"],
                        "role": data["role"],
                        "email": data["email"],
                        "is_active_staff": True,
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                self.stdout.write(f"  Staff {'created' if created else 'exists'}: {user}")

            accountants = list(User.objects.filter(role=Role.ACCOUNTANT, is_active_staff=True))

        return accountants

    def _seed_departments(self):
        departments = list(Department.objects.filter(is_active=True))

        if not departments:
            self.stdout.write(self.style.WARNING(
                "  No existing Departments found; creating fallback departments."
            ))
            for data in FALLBACK_DEPARTMENTS:
                dept, created = Department.objects.get_or_create(
                    name=data["name"],
                    defaults=data,
                )
                departments.append(dept)
                self.stdout.write(f"  Department {'created' if created else 'exists'}: {dept}")

        return departments

    def _seed_accounts(self):
        accounts = {}
        # top-level (no parent) accounts first, then children, so parent
        # lookups always resolve
        for code, name, account_type, parent_code in ACCOUNTS_DATA:
            parent = accounts.get(parent_code) if parent_code else None
            account, created = Account.objects.get_or_create(
                code=code,
                defaults=dict(
                    name=name,
                    account_type=account_type,
                    parent=parent,
                    description=f"{SEED_TAG}: {name}",
                ),
            )
            accounts[code] = account
            self.stdout.write(f"  Account {'created' if created else 'exists'}: {account}")
        return accounts

    def _seed_fiscal_periods(self):
        today = timezone.now().date()
        periods = []
        # current month plus the two preceding months
        for offset in range(2, -1, -1):
            month = today.month - offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year, 12, 31)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)

            name = f"{SEED_TAG} {start_date.strftime('%B %Y')}"
            period, created = FiscalPeriod.objects.get_or_create(
                name=name,
                defaults=dict(
                    start_date=start_date,
                    end_date=end_date,
                    is_closed=(offset > 0),  # past months closed, current month open
                ),
            )
            periods.append(period)
            self.stdout.write(f"  Fiscal period {'created' if created else 'exists'}: {period}")
        return periods

    def _seed_expense_categories(self, accounts):
        for name, account_code in EXPENSE_CATEGORIES_DATA:
            category, created = ExpenseCategory.objects.get_or_create(
                name=name,
                defaults=dict(default_account=accounts[account_code]),
            )
            self.stdout.write(f"  Expense category {'created' if created else 'exists'}: {category}")

    # -- journal entries -------------------------------------------------------

    def _create_journal_entry(self, description, source, entry_date, fiscal_period,
                               lines, created_by=None, posted=True, posted_by=None):
        """lines: list of (account, debit, credit, line_description)"""
        entry = JournalEntry.objects.create(
            entry_date=entry_date,
            fiscal_period=fiscal_period,
            reference=f"{SEED_TAG}",
            description=f"{SEED_TAG}: {description}",
            source=source,
            status=JournalEntryStatus.POSTED if posted else JournalEntryStatus.DRAFT,
            created_by=created_by,
            posted_by=posted_by if posted else None,
            posted_at=timezone.now() if posted else None,
        )
        for account, debit, credit, line_description in lines:
            JournalEntryLine.objects.create(
                entry=entry,
                account=account,
                debit=debit,
                credit=credit,
                description=line_description,
            )
        return entry

    def _seed_journal_entries(self, accounts, fiscal_periods, accountants):
        poster = accountants[0] if accountants else None
        oldest_period = fiscal_periods[0]
        current_period = fiscal_periods[-1]

        # Opening capital injection
        self._create_journal_entry(
            description="Opening capital injection",
            source=JournalEntrySource.MANUAL,
            entry_date=oldest_period.start_date,
            fiscal_period=oldest_period,
            lines=[
                (accounts["1010"], 2_000_000, 0, "Initial cash deposit"),
                (accounts["3010"], 0, 2_000_000, "Owner's capital contribution"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        # Patient revenue recognised (consultation, lab, pharmacy) — accrued to AR
        self._create_journal_entry(
            description="Patient revenue accrual - month close",
            source=JournalEntrySource.PATIENT_REVENUE,
            entry_date=current_period.start_date + timedelta(days=10),
            fiscal_period=current_period,
            lines=[
                (accounts["1020"], 850_000, 0, "Total patient charges accrued"),
                (accounts["4010"], 0, 300_000, "Consultation revenue"),
                (accounts["4020"], 0, 150_000, "Laboratory revenue"),
                (accounts["4040"], 0, 250_000, "Pharmacy revenue"),
                (accounts["4050"], 0, 150_000, "Theatre / procedure revenue"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        # Cash collected against receivables
        self._create_journal_entry(
            description="Cash collections against patient receivables",
            source=JournalEntrySource.PATIENT_REVENUE,
            entry_date=current_period.start_date + timedelta(days=12),
            fiscal_period=current_period,
            lines=[
                (accounts["1010"], 600_000, 0, "Cash/M-Pesa/card receipts"),
                (accounts["1020"], 0, 600_000, "Reduction of patient receivables"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        # Supplier payment
        self._create_journal_entry(
            description="Payment to pharmaceutical supplier",
            source=JournalEntrySource.SUPPLIER_PAYMENT,
            entry_date=current_period.start_date + timedelta(days=15),
            fiscal_period=current_period,
            lines=[
                (accounts["2010"], 180_000, 0, "Settling supplier invoice"),
                (accounts["1010"], 0, 180_000, "Payment from operating cash"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        # Payroll accrual
        self._create_journal_entry(
            description="Monthly payroll accrual",
            source=JournalEntrySource.PAYROLL,
            entry_date=current_period.start_date + timedelta(days=28),
            fiscal_period=current_period,
            lines=[
                (accounts["5010"], 420_000, 0, "Staff salaries and wages"),
                (accounts["2020"], 0, 420_000, "Accrued payroll liability"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        # Rent expense
        self._create_journal_entry(
            description="Monthly facility rent",
            source=JournalEntrySource.EXPENSE,
            entry_date=current_period.start_date + timedelta(days=5),
            fiscal_period=current_period,
            lines=[
                (accounts["5040"], 120_000, 0, "Facility rent"),
                (accounts["1010"], 0, 120_000, "Paid from operating cash"),
            ],
            created_by=poster,
            posted_by=poster,
        )

        self.stdout.write("  Journal entries created (opening capital, revenue, collections, supplier payment, payroll, rent).")

    # -- expenses & budgets -----------------------------------------------------

    def _seed_expenses(self, departments, accountants, accounts):
        submitter = accountants[0] if accountants else None
        approver = accountants[-1] if accountants else None
        today = timezone.now().date()

        expense_defs = [
            ("Utilities", "Electricity and water bill - main facility", 45000, ExpenseStatus.PAID),
            ("Rent", "Monthly rent - outpatient wing", 120000, ExpenseStatus.PAID),
            ("Medical Supplies", "Restock of surgical consumables", 68000, ExpenseStatus.APPROVED),
            ("Equipment Maintenance", "Servicing of X-ray machine", 35000, ExpenseStatus.APPROVED),
            ("Administrative", "Office stationery and printing", 9500, ExpenseStatus.PENDING_APPROVAL),
        ]

        for i, (category_name, description, amount, status) in enumerate(expense_defs):
            category = ExpenseCategory.objects.get(name=category_name)
            department = departments[i % len(departments)] if departments else None

            expense, created = Expense.objects.get_or_create(
                category=category,
                description=f"{SEED_TAG}: {description}",
                defaults=dict(
                    department=department,
                    amount=amount,
                    expense_date=today - timedelta(days=random.randint(1, 20)),
                    receipt_reference=f"{SEED_TAG}-RCPT-{i + 1:03d}",
                    status=status,
                    submitted_by=submitter,
                    approved_by=approver if status in (ExpenseStatus.APPROVED, ExpenseStatus.PAID) else None,
                    approved_at=timezone.now() if status in (ExpenseStatus.APPROVED, ExpenseStatus.PAID) else None,
                ),
            )

            if created and status == ExpenseStatus.PAID and category.default_account:
                entry = self._create_journal_entry(
                    description=f"Expense payment - {description}",
                    source=JournalEntrySource.EXPENSE,
                    entry_date=expense.expense_date,
                    fiscal_period=None,
                    lines=[
                        (category.default_account, amount, 0, description),
                        (accounts["1010"], 0, amount, "Paid from operating cash"),
                    ],
                    created_by=submitter,
                    posted_by=approver,
                )
                expense.journal_entry = entry
                expense.save(update_fields=["journal_entry"])

            self.stdout.write(f"  Expense {'created' if created else 'exists'}: {expense}")

    def _seed_budgets(self, departments, fiscal_periods, accountants):
        creator = accountants[0] if accountants else None
        current_period = fiscal_periods[-1]

        for department in departments:
            amount = random.choice([300000, 450000, 600000, 800000])
            budget, created = Budget.objects.get_or_create(
                department=department,
                fiscal_period=current_period,
                defaults=dict(
                    allocated_amount=amount,
                    notes=f"{SEED_TAG}: baseline allocation for {current_period.name}",
                    created_by=creator,
                ),
            )
            self.stdout.write(f"  Budget {'created' if created else 'exists'}: {budget}")