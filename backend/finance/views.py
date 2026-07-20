from datetime import date, timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin, IsCashierOrAccountant
from api.models import Payment, OTCSale, Invoice

from .models import (
    Account, AccountType, FiscalPeriod, JournalEntry, JournalEntryLine, JournalEntryStatus,
    ExpenseCategory, Expense, ExpenseStatus, Budget,
)
from .serializers import (
    AccountSerializer, FiscalPeriodSerializer, JournalEntrySerializer, JournalEntryListSerializer,
    CreateJournalEntrySerializer, ExpenseCategorySerializer, ExpenseSerializer,
    RejectExpenseSerializer, BudgetSerializer,
)
from .services import post_journal_entry


class AccountViewSet(BaseModelViewSet):
    queryset = Account.objects.filter(is_active=True)
    serializer_class = AccountSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    filterset_fields = ["account_type", "parent"]
    search_fields = ["code", "name"]


class FiscalPeriodViewSet(BaseModelViewSet):
    queryset = FiscalPeriod.objects.all()
    serializer_class = FiscalPeriodSerializer
    permission_classes = [IsCashierOrAccountant]

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        period = self.get_object()
        if period.is_closed:
            raise ValidationError({"detail": "This period is already closed."})
        if JournalEntry.objects.filter(fiscal_period=period, status=JournalEntryStatus.DRAFT).exists():
            raise ValidationError({"detail": "All journal entries in this period must be posted or voided before closing."})
        period.is_closed = True
        period.closed_by = request.user
        period.closed_at = timezone.now()
        period.save(update_fields=["is_closed", "closed_by", "closed_at"])
        return Response(FiscalPeriodSerializer(period).data)


class JournalEntryViewSet(BaseModelViewSet):
    queryset = JournalEntry.objects.select_related("fiscal_period", "created_by").prefetch_related("lines__account").all()
    filterset_fields = ["status", "source", "fiscal_period"]
    search_fields = ["entry_number", "reference", "description"]
    permission_classes = [IsCashierOrAccountant]
    http_method_names = ["get", "post", "head", "options"]  # entries are immutable once created — void, don't edit

    def get_serializer_class(self):
        if self.action == "list":
            return JournalEntryListSerializer
        return JournalEntrySerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateJournalEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            entry = JournalEntry.objects.create(
                entry_date=data["entry_date"], fiscal_period_id=data.get("fiscal_period"),
                reference=data.get("reference", ""), description=data["description"],
                source="MANUAL", created_by=request.user,
            )
            for line in data["lines"]:
                JournalEntryLine.objects.create(
                    entry=entry, account_id=line["account"],
                    debit=line.get("debit", 0), credit=line.get("credit", 0),
                    description=line.get("description", ""),
                )

        return Response(JournalEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="post")
    def post_entry(self, request, pk=None):
        try:
            entry = post_journal_entry(pk, user=request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})
        return Response(JournalEntrySerializer(entry).data)

    @action(detail=True, methods=["post"], url_path="void")
    def void(self, request, pk=None):
        entry = self.get_object()
        if entry.status != JournalEntryStatus.POSTED:
            raise ValidationError({"detail": "Only posted entries can be voided."})
        entry.status = JournalEntryStatus.VOIDED
        entry.save(update_fields=["status"])
        return Response(JournalEntrySerializer(entry).data)


class ExpenseCategoryViewSet(BaseModelViewSet):
    queryset = ExpenseCategory.objects.filter(is_active=True)
    serializer_class = ExpenseCategorySerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name"]


class ExpenseViewSet(BaseModelViewSet):
    queryset = Expense.objects.select_related("category", "department", "submitted_by").all()
    serializer_class = ExpenseSerializer
    filterset_fields = ["status", "category", "department"]
    search_fields = ["expense_number", "description", "receipt_reference"]

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        expense = self.get_object()
        if expense.status != ExpenseStatus.PENDING_APPROVAL:
            raise ValidationError({"detail": "Only pending expenses can be approved."})
        expense.status = ExpenseStatus.APPROVED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save(update_fields=["status", "approved_by", "approved_at"])
        return Response(ExpenseSerializer(expense).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        expense = self.get_object()
        if expense.status != ExpenseStatus.PENDING_APPROVAL:
            raise ValidationError({"detail": "Only pending expenses can be rejected."})
        serializer = RejectExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense.status = ExpenseStatus.REJECTED
        expense.rejection_reason = serializer.validated_data["rejection_reason"]
        expense.save(update_fields=["status", "rejection_reason"])
        return Response(ExpenseSerializer(expense).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        expense = self.get_object()
        if expense.status != ExpenseStatus.APPROVED:
            raise ValidationError({"detail": "Only approved expenses can be marked paid."})

        with transaction.atomic():
            cash_account = Account.objects.filter(code="1000").first()  # convention: 1000 = Cash/Bank
            expense_account = expense.category.default_account
            if cash_account and expense_account:
                from .services import create_and_post_entry
                entry = create_and_post_entry(
                    entry_date=date.today(),
                    description=f"Expense payment - {expense.expense_number} ({expense.category.name})",
                    lines=[
                        {"account": expense_account.id, "debit": expense.amount, "credit": 0},
                        {"account": cash_account.id, "debit": 0, "credit": expense.amount},
                    ],
                    source="EXPENSE", reference=expense.expense_number, user=request.user,
                )
                expense.journal_entry = entry

            expense.status = ExpenseStatus.PAID
            expense.save(update_fields=["status", "journal_entry"])

        return Response(ExpenseSerializer(expense).data)

    @action(detail=False, methods=["get"], url_path="pending-approval")
    def pending_approval(self, request):
        qs = self.get_queryset().filter(status=ExpenseStatus.PENDING_APPROVAL)
        return Response(ExpenseSerializer(qs, many=True).data)


class BudgetViewSet(BaseModelViewSet):
    queryset = Budget.objects.select_related("department", "fiscal_period").all()
    serializer_class = BudgetSerializer
    filterset_fields = ["department", "fiscal_period"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FinancialSummaryView(APIView):
    """
    Read-only dashboard aggregating existing billing data (Payment, OTCSale)
    alongside posted journal entries — a P&L-style snapshot without
    requiring every module to post to the ledger directly.
    """
    permission_classes = [IsCashierOrAccountant]

    def get(self, request):
        date_from = request.query_params.get("date_from") or str(date.today() - timedelta(days=30))
        date_to = request.query_params.get("date_to") or str(date.today())

        hospital_revenue = Payment.objects.filter(
            paid_at__date__gte=date_from, paid_at__date__lte=date_to
        ).aggregate(t=Sum("amount"))["t"] or 0
        otc_revenue = OTCSale.objects.filter(
            sold_at__date__gte=date_from, sold_at__date__lte=date_to
        ).aggregate(t=Sum("amount_paid"))["t"] or 0
        total_revenue = hospital_revenue + otc_revenue

        total_expenses = Expense.objects.filter(
            status="PAID", expense_date__gte=date_from, expense_date__lte=date_to
        ).aggregate(t=Sum("amount"))["t"] or 0

        outstanding_receivables = sum((inv.balance for inv in Invoice.objects.exclude(status__in=["PAID", "CANCELLED"])), start=0)

        accounts_summary = [
            {"code": a.code, "name": a.name, "type": a.account_type, "balance": str(a.balance)}
            for a in Account.objects.filter(is_active=True)
        ]

        return Response({
            "date_from": date_from, "date_to": date_to,
            "total_revenue": str(total_revenue),
            "total_expenses": str(total_expenses),
            "net_income": str(total_revenue - total_expenses),
            "outstanding_receivables": str(outstanding_receivables),
            "accounts": accounts_summary,
        })