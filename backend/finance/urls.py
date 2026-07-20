from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet, FiscalPeriodViewSet, JournalEntryViewSet,
    ExpenseCategoryViewSet, ExpenseViewSet, BudgetViewSet, FinancialSummaryView,
)

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"fiscal-periods", FiscalPeriodViewSet, basename="fiscal-period")
router.register(r"journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register(r"expense-categories", ExpenseCategoryViewSet, basename="expense-category")
router.register(r"expenses", ExpenseViewSet, basename="expense")
router.register(r"budgets", BudgetViewSet, basename="budget")

urlpatterns = [
    path("finance/summary/", FinancialSummaryView.as_view(), name="finance-summary"),
    path("", include(router.urls)),
]