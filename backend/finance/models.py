from django.db import models
from django.core.validators import MinValueValidator

from api.models import BaseModel, User, Department


class AccountType(models.TextChoices):
    ASSET = "ASSET", "Asset"
    LIABILITY = "LIABILITY", "Liability"
    EQUITY = "EQUITY", "Equity"
    REVENUE = "REVENUE", "Revenue"
    EXPENSE = "EXPENSE", "Expense"


class Account(BaseModel):
    """Chart of Accounts. Self-referencing for sub-accounts (e.g. 'Cash' under 'Current Assets')."""
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="sub_accounts")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "accounts"
        ordering = ["code"]

    @property
    def balance(self):
        """Sum of all posted journal lines. Debit-normal accounts (Asset, Expense) are positive on debit; Credit-normal (Liability, Equity, Revenue) are positive on credit."""
        debit_total = sum((l.debit for l in self.journal_lines.filter(entry__status="POSTED")), start=0)
        credit_total = sum((l.credit for l in self.journal_lines.filter(entry__status="POSTED")), start=0)
        if self.account_type in (AccountType.ASSET, AccountType.EXPENSE):
            return debit_total - credit_total
        return credit_total - debit_total

    def __str__(self):
        return f"{self.code} - {self.name}"


class FiscalPeriod(BaseModel):
    name = models.CharField(max_length=50, unique=True, help_text="e.g. 'July 2026'")
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    closed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="fiscal_periods_closed")
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "fiscal_periods"
        ordering = ["-start_date"]

    def __str__(self):
        return self.name


class JournalEntryStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    VOIDED = "VOIDED", "Voided"


class JournalEntrySource(models.TextChoices):
    MANUAL = "MANUAL", "Manual Entry"
    PATIENT_REVENUE = "PATIENT_REVENUE", "Patient Revenue (auto)"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier Payment (auto)"
    PAYROLL = "PAYROLL", "Payroll (auto)"
    EXPENSE = "EXPENSE", "Operating Expense"


class JournalEntry(BaseModel):
    entry_number = models.CharField(max_length=30, unique=True, editable=False)
    entry_date = models.DateField()
    fiscal_period = models.ForeignKey(FiscalPeriod, null=True, blank=True, on_delete=models.SET_NULL, related_name="journal_entries")
    reference = models.CharField(max_length=100, blank=True, help_text="e.g. receipt number, PO number, payslip number.")
    description = models.TextField()
    source = models.CharField(max_length=30, choices=JournalEntrySource.choices, default=JournalEntrySource.MANUAL)
    status = models.CharField(max_length=20, choices=JournalEntryStatus.choices, default=JournalEntryStatus.DRAFT)

    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="journal_entries_created")
    posted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="journal_entries_posted")
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "journal_entries"
        ordering = ["-entry_date", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.entry_number:
            from .utils import generate_entry_number
            self.entry_number = generate_entry_number()
        super().save(*args, **kwargs)

    @property
    def total_debit(self):
        return sum((l.debit for l in self.lines.all()), start=0)

    @property
    def total_credit(self):
        return sum((l.credit for l in self.lines.all()), start=0)

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit and self.total_debit > 0

    def __str__(self):
        return f"{self.entry_number} - {self.description[:50]}"


class JournalEntryLine(BaseModel):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_lines")
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "journal_entry_lines"

    def __str__(self):
        return f"{self.account.code} - Dr {self.debit} / Cr {self.credit}"


class ExpenseCategory(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    default_account = models.ForeignKey(Account, null=True, blank=True, on_delete=models.SET_NULL, related_name="expense_categories")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "expense_categories"
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return self.name


class ExpenseStatus(models.TextChoices):
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    PAID = "PAID", "Paid"


class Expense(BaseModel):
    expense_number = models.CharField(max_length=30, unique=True, editable=False)
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name="expenses")
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="expenses")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    expense_date = models.DateField()
    description = models.TextField(blank=True)
    receipt_reference = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=ExpenseStatus.choices, default=ExpenseStatus.PENDING_APPROVAL)

    submitted_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="expenses_submitted")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="expenses_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    journal_entry = models.ForeignKey(JournalEntry, null=True, blank=True, on_delete=models.SET_NULL, related_name="expenses")

    class Meta:
        db_table = "expenses"
        ordering = ["-expense_date"]

    def save(self, *args, **kwargs):
        if not self.expense_number:
            from .utils import generate_expense_number
            self.expense_number = generate_expense_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.expense_number} - {self.category.name} (KES {self.amount})"


class Budget(BaseModel):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="budgets")
    fiscal_period = models.ForeignKey(FiscalPeriod, on_delete=models.CASCADE, related_name="budgets")
    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="budgets_created")

    class Meta:
        db_table = "budgets"
        unique_together = ("department", "fiscal_period")

    @property
    def spent_amount(self):
        return sum((
            e.amount for e in Expense.objects.filter(
                department=self.department, status="PAID",
                expense_date__gte=self.fiscal_period.start_date,
                expense_date__lte=self.fiscal_period.end_date,
            )
        ), start=0)

    @property
    def remaining_amount(self):
        return self.allocated_amount - self.spent_amount

    def __str__(self):
        return f"{self.department.name} - {self.fiscal_period.name}"