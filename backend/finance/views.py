#finance/views.py
from datetime import date, timedelta

from django.db import transaction, IntegrityError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import ValidationError, PermissionDenied
from security.services import log_audit_event
from security.models import AuditEventType

from .serializers import (
    AccountSerializer, FiscalPeriodSerializer, JournalEntrySerializer, JournalEntryListSerializer,
    CreateJournalEntrySerializer, ExpenseCategorySerializer, ExpenseSerializer,
    RejectExpenseSerializer, BudgetSerializer, CashDropSerializer , CashierShiftSerializer , OpenShiftSerializer
)

from .serializers import (
    AccountSerializer, FiscalPeriodSerializer, JournalEntrySerializer, JournalEntryListSerializer,
    CreateJournalEntrySerializer, ExpenseCategorySerializer, ExpenseSerializer,
    RejectExpenseSerializer, BudgetSerializer, CashDropSerializer, CashierShiftSerializer, OpenShiftSerializer,
    CloseShiftSerializer, RecordCashDropSerializer,
)

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin, IsCashierOrAccountant
from api.models import Payment, OTCSale, Invoice

from .models import (
    Account, AccountType, FiscalPeriod, JournalEntry, JournalEntryLine, JournalEntryStatus,
    ExpenseCategory, Expense, ExpenseStatus, Budget, CashDrop , CashierShift
)
from .serializers import (
    AccountSerializer, FiscalPeriodSerializer, JournalEntrySerializer, JournalEntryListSerializer,
    CreateJournalEntrySerializer, ExpenseCategorySerializer, ExpenseSerializer,
    RejectExpenseSerializer, BudgetSerializer, CashDropSerializer , CashierShiftSerializer , OpenShiftSerializer
)
from .services import post_journal_entry


def _accessible_branch_ids(user):
    from branches.permissions import get_accessible_branch_ids
    return get_accessible_branch_ids(user)


def _resolve_branch_id(request):
    """
    Standard branch-stamping logic: GROUP_ADMIN may pass an explicit
    `branch` in the request body, everyone else always gets their own
    branch, never trusting the payload.
    """
    accessible = _accessible_branch_ids(request.user)
    if accessible is None:
        return request.data.get("branch") or request.user.branch_id
    return request.user.branch_id


class AccountViewSet(BaseModelViewSet):
    # Chart of accounts — deliberately NOT branch-scoped, shared org-wide
    # structure, same as Medicine's catalog.
    queryset = Account.objects.filter(is_active=True)
    serializer_class = AccountSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    filterset_fields = ["account_type", "parent"]
    search_fields = ["code", "name"]


class FiscalPeriodViewSet(BaseModelViewSet):
    # Fiscal calendar — deliberately NOT branch-scoped, shared org-wide.
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
    queryset = JournalEntry.objects.select_related("fiscal_period", "created_by", "branch").prefetch_related("lines__account").all()
    filterset_fields = ["status", "source", "fiscal_period"]
    search_fields = ["entry_number", "reference", "description"]
    permission_classes = [IsCashierOrAccountant]
    http_method_names = ["get", "post", "head", "options"]  # entries are immutable once created — void, don't edit

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return qs

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
                branch_id=_resolve_branch_id(request),
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
    # Expense category list — deliberately NOT branch-scoped, shared org-wide.
    queryset = ExpenseCategory.objects.filter(is_active=True)
    serializer_class = ExpenseCategorySerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name"]


class ExpenseViewSet(BaseModelViewSet):
    queryset = Expense.objects.select_related("category", "department", "submitted_by", "branch").all()
    serializer_class = ExpenseSerializer
    filterset_fields = ["status", "category", "department"]
    search_fields = ["expense_number", "description", "receipt_reference"]

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user, branch_id=_resolve_branch_id(self.request))

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
                # The auto-generated journal entry belongs to the same
                # branch as the expense it settles.
                if entry.branch_id != expense.branch_id:
                    entry.branch_id = expense.branch_id
                    entry.save(update_fields=["branch"])
                expense.journal_entry = entry

            expense.status = ExpenseStatus.PAID
            expense.save(update_fields=["status", "journal_entry"])

        return Response(ExpenseSerializer(expense).data)

    @action(detail=False, methods=["get"], url_path="pending-approval")
    def pending_approval(self, request):
        qs = self.get_queryset().filter(status=ExpenseStatus.PENDING_APPROVAL)
        return Response(ExpenseSerializer(qs, many=True).data)


class BudgetViewSet(BaseModelViewSet):
    queryset = Budget.objects.select_related("department", "fiscal_period", "branch").all()
    serializer_class = BudgetSerializer
    permission_classes = []
    filterset_fields = ["department", "fiscal_period"]

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return qs

    def perform_create(self, serializer):
        # IMPORTANT: Budget.objects is a SoftDeleteManager, but the DB-level
        # unique_together constraint on (department, fiscal_period, branch)
        # applies to ALL rows, including soft-deleted ones. So we check
        # against all_objects here — if a soft-deleted budget exists for
        # this department/period/branch, we revive it with the new data
        # instead of trying to insert a new row (which would hit the DB
        # constraint and throw a raw IntegrityError).
        department = serializer.validated_data.get("department")
        fiscal_period = serializer.validated_data.get("fiscal_period")
        branch_id = _resolve_branch_id(self.request)

        existing = Budget.all_objects.filter(
            department=department, fiscal_period=fiscal_period, branch_id=branch_id
        ).first()

        if existing is not None:
            if existing.is_deleted:
                # Silently restore and apply the newly-submitted values, as if this
                # were a fresh create.
                existing.is_deleted = False
                existing.deleted_at = None
                existing.allocated_amount = serializer.validated_data.get("allocated_amount", existing.allocated_amount)
                existing.notes = serializer.validated_data.get("notes", existing.notes)
                existing.created_by = self.request.user
                existing.save(update_fields=["is_deleted", "deleted_at", "allocated_amount", "notes", "created_by"])
                serializer.instance = existing
                return

            raise ValidationError({
                "detail": f"A budget already exists for {department} in {fiscal_period} at your branch. "
                        f"Edit the existing budget line instead of creating a new one."
            })

        try:
            with transaction.atomic():
                serializer.save(created_by=self.request.user, branch_id=branch_id)
        except IntegrityError:
            # Genuine race: two requests both passed the check above before either
            # committed. Don't leak the raw DB error string to the client.
            raise ValidationError({
                "detail": "A budget for this department, fiscal period, and branch was just created "
                        "by another request. Please refresh and edit the existing line."
            })

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        """Undelete a soft-deleted budget line, e.g. after hitting the duplicate-on-create error above."""
        budget = Budget.all_objects.filter(pk=pk).first()
        if budget is None:
            raise ValidationError({"detail": "No budget found with that id."})
        if not budget.is_deleted:
            raise ValidationError({"detail": "This budget is not deleted."})

        # Guard against restoring into a live duplicate (e.g. someone created a new
        # budget for this department/period/branch after the old one was deleted).
        conflict = Budget.objects.filter(
            department=budget.department, fiscal_period=budget.fiscal_period, branch_id=budget.branch_id
        ).exclude(pk=budget.pk).exists()
        if conflict:
            raise ValidationError({
                "detail": "Cannot restore: a different active budget already exists for "
                          "this department, fiscal period, and branch."
            })

        budget.is_deleted = False
        budget.deleted_at = None
        budget.save(update_fields=["is_deleted", "deleted_at"])
        return Response(BudgetSerializer(budget).data)

    @action(detail=False, methods=["get"], url_path="my-department")
    def my_department(self, request):
        """The requesting user's own department's active budget lines at their own branch — used by the requisition form to pick a valid budget line and show real-time utilization before submitting."""
        if not request.user.department_id:
            return Response([])
        qs = self.get_queryset().filter(department=request.user.department)
        return Response(BudgetSerializer(qs, many=True).data)


class FinancialSummaryView(APIView):
    """
    Read-only dashboard aggregating existing billing data (Payment, OTCSale)
    alongside posted journal entries — a P&L-style snapshot without
    requiring every module to post to the ledger directly. Now branch-scoped:
    revenue, expenses, and receivables reflect only this user's accessible
    branch(es). The chart-of-accounts balances at the bottom remain
    org-wide, since Account itself is shared structure, not branch-owned.
    """
    permission_classes = [IsCashierOrAccountant]

    def get(self, request):
        accessible = _accessible_branch_ids(request.user)
        branch_name = None if accessible is None else (request.user.branch.name if request.user.branch_id else None)

        date_from = request.query_params.get("date_from") or str(date.today() - timedelta(days=30))
        date_to = request.query_params.get("date_to") or str(date.today())

        payments_qs = Payment.objects.filter(paid_at__date__gte=date_from, paid_at__date__lte=date_to)
        otc_qs = OTCSale.objects.filter(sold_at__date__gte=date_from, sold_at__date__lte=date_to)
        expenses_qs = Expense.objects.filter(status="PAID", expense_date__gte=date_from, expense_date__lte=date_to)
        outstanding_qs = Invoice.objects.exclude(status__in=["PAID", "CANCELLED"])

        if accessible is not None:
            payments_qs = payments_qs.filter(branch_id__in=accessible)
            otc_qs = otc_qs.filter(branch_id__in=accessible)
            expenses_qs = expenses_qs.filter(branch_id__in=accessible)
            outstanding_qs = outstanding_qs.filter(branch_id__in=accessible)

        hospital_revenue = payments_qs.aggregate(t=Sum("amount"))["t"] or 0
        otc_revenue = otc_qs.aggregate(t=Sum("amount_paid"))["t"] or 0
        total_revenue = hospital_revenue + otc_revenue

        total_expenses = expenses_qs.aggregate(t=Sum("amount"))["t"] or 0

        outstanding_receivables = sum((inv.balance for inv in outstanding_qs), start=0)

        # Chart-of-accounts balances stay org-wide — Account is shared
        # structure, not branch-owned (see AccountViewSet).
        accounts_summary = [
            {"code": a.code, "name": a.name, "type": a.account_type, "balance": str(a.balance)}
            for a in Account.objects.filter(is_active=True)
        ]

        return Response({
            "date_from": date_from, "date_to": date_to,
            "branch_name": branch_name,
            "total_revenue": str(total_revenue),
            "total_expenses": str(total_expenses),
            "net_income": str(total_revenue - total_expenses),
            "outstanding_receivables": str(outstanding_receivables),
            "accounts": accounts_summary,
        })
        
        


class CashierShiftViewSet(BaseModelViewSet):
    queryset = CashierShift.objects.select_related("cashier", "approved_by", "branch").all()
    filterset_fields = ["status", "cashier"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return CashierShiftSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Cashiers only ever see their own shifts; Accountant/Super Admin
        # see every cashier's shifts, but only at their own accessible
        # branch(es) — never another branch's till activity.
        if self.request.user.role == "CASHIER":
            return qs.filter(cashier=self.request.user)
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return qs

    def create(self, request, *args, **kwargs):
        if CashierShift.objects.filter(cashier=request.user, status="OPEN").exists():
            raise ValidationError({"detail": "You already have an open till. Close it before opening a new one."})

        serializer = OpenShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift = CashierShift.objects.create(
            cashier=request.user, opening_float=serializer.validated_data["opening_float"],
            branch_id=request.user.branch_id,
        )
        log_audit_event(AuditEventType.LOGIN, user=request.user, request=request, description=f"Cashier till opened with float KES {shift.opening_float}.")
        return Response(CashierShiftSerializer(shift).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="record-cash-drop")
    def record_cash_drop(self, request, pk=None):
        shift = self.get_object()
        if shift.status != "OPEN":
            raise ValidationError({"detail": "Cannot record a cash drop on a closed shift."})
        if shift.cashier != request.user:
            raise PermissionDenied("You can only record cash drops on your own till.")

        serializer = RecordCashDropSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        drop = CashDrop.objects.create(shift=shift, recorded_by=request.user, **serializer.validated_data)
        return Response(CashDropSerializer(drop).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        shift = self.get_object()
        if shift.status != "OPEN":
            raise ValidationError({"detail": "This shift is already closed."})
        if shift.cashier != request.user and request.user.role not in ("ACCOUNTANT", "SUPER_ADMIN"):
            raise PermissionDenied("You can only close your own till.")

        serializer = CloseShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from .services import close_cashier_shift
        shift = close_cashier_shift(
            shift, serializer.validated_data["counted_cash"],
            serializer.validated_data.get("notes", ""), request.user,
        )

        description = f"Till closed. Expected KES {shift.expected_cash}, counted KES {shift.counted_cash}, variance KES {shift.variance}."
        log_audit_event(AuditEventType.LOGOUT, user=shift.cashier, actor=request.user, request=request, description=description)

        return Response(CashierShiftSerializer(shift).data)

    @action(detail=True, methods=["post"], url_path="approve-variance")
    def approve_variance(self, request, pk=None):
        """Supervisor sign-off required when a shift closed with a variance over tolerance."""
        shift = self.get_object()
        if shift.status != "CLOSED_WITH_VARIANCE":
            raise ValidationError({"detail": "Only variance-flagged shifts require approval."})
        if request.user.role not in ("ACCOUNTANT", "SUPER_ADMIN"):
            raise PermissionDenied("Only an accountant or super admin can approve a cash variance.")

        shift.status = "CLOSED"
        shift.approved_by = request.user
        from django.utils import timezone
        shift.approved_at = timezone.now()
        shift.save(update_fields=["status", "approved_by", "approved_at"])

        log_audit_event(AuditEventType.LOGIN, user=shift.cashier, actor=request.user, request=request,
                         description=f"Cash variance of KES {shift.variance} approved by {request.user.username}.")
        return Response(CashierShiftSerializer(shift).data)

    @action(detail=False, methods=["get"], url_path="my-open-shift")
    def my_open_shift(self, request):
        shift = CashierShift.objects.filter(cashier=request.user, status="OPEN").first()
        if not shift:
            return Response(None)
        return Response(CashierShiftSerializer(shift).data)

    @action(detail=False, methods=["get"], url_path="pending-variance")
    def pending_variance(self, request):
        qs = self.get_queryset().filter(status="CLOSED_WITH_VARIANCE")
        return Response(CashierShiftSerializer(qs, many=True).data)