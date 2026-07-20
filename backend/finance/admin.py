from django.contrib import admin

from .models import Account, FiscalPeriod, JournalEntry, JournalEntryLine, ExpenseCategory, Expense, Budget


class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "account_type", "parent", "is_active"]
    list_filter = ["account_type"]
    search_fields = ["code", "name"]


@admin.register(FiscalPeriod)
class FiscalPeriodAdmin(admin.ModelAdmin):
    list_display = ["name", "start_date", "end_date", "is_closed"]


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ["entry_number", "entry_date", "source", "status", "description"]
    list_filter = ["status", "source"]
    search_fields = ["entry_number", "reference", "description"]
    inlines = [JournalEntryLineInline]


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "default_account", "is_active"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["expense_number", "category", "amount", "status", "expense_date"]
    list_filter = ["status"]
    search_fields = ["expense_number"]


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ["department", "fiscal_period", "allocated_amount"]