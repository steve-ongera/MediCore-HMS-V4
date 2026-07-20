from rest_framework import serializers

from .models import (
    Account, FiscalPeriod, JournalEntry, JournalEntryLine,
    ExpenseCategory, Expense, Budget,
)


class AccountSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ["id", "code", "name", "account_type", "parent", "parent_name", "description", "is_active", "balance"]

    def get_balance(self, obj):
        return str(obj.balance)


class FiscalPeriodSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source="closed_by.get_full_name", read_only=True)

    class Meta:
        model = FiscalPeriod
        fields = ["id", "name", "start_date", "end_date", "is_closed", "closed_by", "closed_by_name", "closed_at"]
        read_only_fields = ["id", "is_closed", "closed_by", "closed_at"]


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = ["id", "entry", "account", "account_code", "account_name", "debit", "credit", "description"]
        read_only_fields = ["id", "entry"]


class JournalEntrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    posted_by_name = serializers.CharField(source="posted_by.get_full_name", read_only=True)
    fiscal_period_name = serializers.CharField(source="fiscal_period.name", read_only=True)
    lines = JournalEntryLineSerializer(many=True, read_only=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id", "entry_number", "entry_date", "fiscal_period", "fiscal_period_name",
            "reference", "description", "source", "status", "created_by", "created_by_name",
            "posted_by", "posted_by_name", "posted_at", "lines", "total_debit", "total_credit",
            "is_balanced", "created_at",
        ]
        read_only_fields = ["id", "entry_number", "status", "created_by", "posted_by", "posted_at", "created_at"]

    def get_total_debit(self, obj):
        return str(obj.total_debit)

    def get_total_credit(self, obj):
        return str(obj.total_credit)


class JournalEntryListSerializer(serializers.ModelSerializer):
    total_debit = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = ["id", "entry_number", "entry_date", "description", "source", "status", "total_debit"]

    def get_total_debit(self, obj):
        return str(obj.total_debit)


class LineInputSerializer(serializers.Serializer):
    account = serializers.UUIDField()
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class CreateJournalEntrySerializer(serializers.Serializer):
    entry_date = serializers.DateField()
    fiscal_period = serializers.UUIDField(required=False, allow_null=True)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField()
    lines = LineInputSerializer(many=True)

    def validate_lines(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("A journal entry needs at least two lines.")
        total_debit = sum((l["debit"] for l in value), start=0)
        total_credit = sum((l["credit"] for l in value), start=0)
        if total_debit != total_credit:
            raise serializers.ValidationError(f"Entry does not balance: Dr {total_debit} vs Cr {total_credit}.")
        if total_debit == 0:
            raise serializers.ValidationError("Entry total cannot be zero.")
        return value


class ExpenseCategorySerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    default_account_name = serializers.CharField(source="default_account.name", read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "default_account", "default_account_name", "is_active"]


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id", "expense_number", "category", "category_name", "department", "department_name",
            "amount", "expense_date", "description", "receipt_reference", "status",
            "submitted_by", "submitted_by_name", "approved_by", "approved_by_name",
            "approved_at", "rejection_reason", "journal_entry", "created_at",
        ]
        read_only_fields = [
            "id", "expense_number", "status", "submitted_by", "approved_by",
            "approved_at", "journal_entry", "created_at",
        ]


class RejectExpenseSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField()


class BudgetSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    fiscal_period_name = serializers.CharField(source="fiscal_period.name", read_only=True)
    spent_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "department", "department_name", "fiscal_period", "fiscal_period_name",
            "allocated_amount", "spent_amount", "remaining_amount", "notes", "created_by",
        ]
        read_only_fields = ["id", "created_by"]

    def get_spent_amount(self, obj):
        return str(obj.spent_amount)

    def get_remaining_amount(self, obj):
        return str(obj.remaining_amount)