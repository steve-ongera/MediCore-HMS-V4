from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied

from api.models import (
    Payment, Invoice, InvoiceStatus, PharmacyDispense, User, Role,
)
from api.permissions import IsAccountant

from .models import Refund, RefundStatus, BillCancellation
from .serializers import (
    RefundSerializer, RequestRefundSerializer, RejectRefundSerializer,
    BillCancellationSerializer, CancelBillSerializer,
)

from branches.permissions import get_accessible_branch_ids


def get(self, request):
    accessible = get_accessible_branch_ids(request.user)
    branch_param = request.query_params.get("branch")

    if accessible is None:  # GROUP_ADMIN
        branch_filter = {"branch_id": branch_param} if branch_param else {}
    else:
        target = branch_param if branch_param in [str(b) for b in accessible] else accessible[0]
        branch_filter = {"branch_id": target}

    # then apply branch_filter to every queryset in the view, e.g.:
    # payments = Payment.objects.filter(paid_at__date__gte=date_from, paid_at__date__lte=date_to, **branch_filter)
    # invoices_in_range = Invoice.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to, **branch_filter)
    # ... apply the same **branch_filter pattern to every other queryset in the view ...

class RefundViewSet(viewsets.ModelViewSet):
    queryset = Refund.objects.select_related("payment__invoice__patient", "requested_by", "approved_by").all()
    serializer_class = RefundSerializer
    filterset_fields = ["status"]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        serializer = RequestRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = Payment.objects.filter(pk=data["payment"]).first()
        if not payment:
            raise ValidationError({"payment": "Payment not found."})

        already_refunded = Refund.objects.filter(payment=payment, status__in=[RefundStatus.APPROVED, RefundStatus.PROCESSED]).aggregate(
            t=Sum("amount")
        )["t"] or 0
        if data["amount"] > (payment.amount - already_refunded):
            raise ValidationError({"amount": f"Cannot refund more than the remaining refundable amount (KES {payment.amount - already_refunded})."})

        refund = Refund.objects.create(payment=payment, amount=data["amount"], reason=data["reason"], requested_by=request.user)
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        refund = self.get_object()
        if refund.status != RefundStatus.REQUESTED:
            raise ValidationError({"detail": "Only requested refunds can be approved."})
        if request.user.role not in (Role.ACCOUNTANT, Role.SUPER_ADMIN):
            raise PermissionDenied("Only an accountant or super admin can approve a refund.")

        with transaction.atomic():
            refund.status = RefundStatus.APPROVED
            refund.approved_by = request.user
            refund.approved_at = timezone.now()
            refund.save(update_fields=["status", "approved_by", "approved_at"])

            invoice = refund.payment.invoice
            invoice.amount_paid = max(invoice.amount_paid - refund.amount, 0)
            invoice.save(update_fields=["amount_paid"])

            refund.status = RefundStatus.PROCESSED
            refund.processed_at = timezone.now()
            refund.save(update_fields=["status", "processed_at"])

        return Response(RefundSerializer(refund).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        refund = self.get_object()
        if refund.status != RefundStatus.REQUESTED:
            raise ValidationError({"detail": "Only requested refunds can be rejected."})
        serializer = RejectRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund.status = RefundStatus.REJECTED
        refund.rejection_reason = serializer.validated_data["rejection_reason"]
        refund.save(update_fields=["status", "rejection_reason"])
        return Response(RefundSerializer(refund).data)
    
    def get_permissions(self):
        if self.action == "create":
            from api.permissions import IsCashierOrAccountant
            return [IsCashierOrAccountant()]
        return super().get_permissions()


class BillCancellationViewSet(viewsets.ModelViewSet):
    queryset = BillCancellation.objects.select_related("invoice__patient", "cancelled_by").all()
    serializer_class = BillCancellationSerializer
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAccountant]

    def create(self, request, *args, **kwargs):
        serializer = CancelBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        invoice = Invoice.objects.filter(pk=data["invoice"]).first()
        if not invoice:
            raise ValidationError({"invoice": "Invoice not found."})
        if invoice.status == InvoiceStatus.PAID:
            raise ValidationError({"detail": "Cannot cancel a fully paid invoice — use a refund instead."})
        if hasattr(invoice, "cancellation"):
            raise ValidationError({"detail": "This invoice is already cancelled."})

        with transaction.atomic():
            cancellation = BillCancellation.objects.create(invoice=invoice, reason=data["reason"], cancelled_by=request.user)
            invoice.status = InvoiceStatus.CANCELLED
            invoice.save(update_fields=["status"])

        return Response(BillCancellationSerializer(cancellation).data, status=status.HTTP_201_CREATED)


class ExecutiveDashboardView(APIView):
    """
    GET /api/executive/dashboard/?date_from=&date_to=
    Single aggregation endpoint powering the whole executive dashboard —
    pulls from Payment, Invoice, PharmacyDispense, User, LeakageRecord,
    InsuranceClaim, Refund, and BillCancellation. Read-only, no writes.
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        date_from = request.query_params.get("date_from") or str(date.today())
        date_to = request.query_params.get("date_to") or str(date.today())

        payments = Payment.objects.filter(paid_at__date__gte=date_from, paid_at__date__lte=date_to)
        invoices_in_range = Invoice.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)

        # ---------------- Revenue / Expenses / Profit ----------------
        total_revenue = payments.aggregate(t=Sum("amount"))["t"] or Decimal("0")

        from finance.models import Expense, ExpenseStatus
        total_expenses = Expense.objects.filter(
            status=ExpenseStatus.PAID, expense_date__gte=date_from, expense_date__lte=date_to
        ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

        profit = total_revenue - total_expenses

        # ---------------- Outstanding bills ----------------
        outstanding = sum((inv.balance for inv in Invoice.objects.exclude(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED])), start=Decimal("0"))

        # ---------------- Cash vs M-Pesa vs other ----------------
        by_method = list(payments.values("method").annotate(total=Sum("amount")).order_by("-total"))

        # ---------------- Best / worst doctor by consultation revenue ----------------
        from api.models import InvoiceSourceType
        doctor_revenue = list(
            invoices_in_range.filter(source_type=InvoiceSourceType.CONSULTATION, visit__doctor__isnull=False)
            .values("visit__doctor__id", "visit__doctor__first_name", "visit__doctor__last_name")
            .annotate(total=Sum("amount_paid"), patient_count=Count("id"))
            .order_by("-total")
        )
        best_doctor = doctor_revenue[0] if doctor_revenue else None

        # ---------------- Department performance ----------------
        dept_revenue = list(
            invoices_in_range.filter(source_type=InvoiceSourceType.CONSULTATION)
            .values("visit__department__name")
            .annotate(total=Sum("amount_paid"), patient_count=Count("id"))
            .order_by("total")  # ascending — worst first
        )
        worst_department = dept_revenue[0] if dept_revenue else None
        best_department_by_rev = list(reversed(dept_revenue))[:5]

        # ---------------- Most prescribed drugs ----------------
        top_drugs = list(
            PharmacyDispense.objects.filter(dispensed_at__date__gte=date_from, dispensed_at__date__lte=date_to)
            .values("prescription__medicine__name")
            .annotate(total_qty=Sum("quantity_dispensed"))
            .order_by("-total_qty")[:10]
        )

        # ---------------- SHA / insurance pending claims ----------------
        try:
            from insurance.models import InsuranceClaim, ClaimStatus
            sha_pending = InsuranceClaim.objects.filter(
                policy__insurer__insurer_type="SHA", status__in=[ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW]
            ).aggregate(t=Sum("total_claimed"), c=Count("id"))
            all_insurance_pending = InsuranceClaim.objects.filter(
                status__in=[ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW]
            ).aggregate(t=Sum("total_claimed"), c=Count("id"))
        except Exception:
            sha_pending = {"t": 0, "c": 0}
            all_insurance_pending = {"t": 0, "c": 0}

        # ---------------- Cancelled bills / refunds ----------------
        cancelled_bills = BillCancellation.objects.filter(cancelled_at__date__gte=date_from, cancelled_at__date__lte=date_to)
        cancelled_total = sum((c.invoice.amount for c in cancelled_bills), start=Decimal("0"))

        refunds_in_range = Refund.objects.filter(
            status="PROCESSED", processed_at__date__gte=date_from, processed_at__date__lte=date_to
        )
        refunds_total = refunds_in_range.aggregate(t=Sum("amount"))["t"] or Decimal("0")

        # ---------------- Revenue leakage (today) ----------------
        try:
            from leakage.models import RevenueLeakageRecord, LeakageStatus
            leakage_total = RevenueLeakageRecord.objects.filter(
                status=LeakageStatus.OPEN, event_date__date__gte=date_from, event_date__date__lte=date_to
            ).aggregate(t=Sum("expected_amount"))["t"] or 0
        except Exception:
            leakage_total = 0

        # ---------------- Trend: last 7 days revenue ----------------
        last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
        revenue_trend = [
            {"name": d.isoformat(), "value": float(Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0)}
            for d in last_7
        ]
        expense_trend = [
            {"name": d.isoformat(), "value": float(Expense.objects.filter(status=ExpenseStatus.PAID, expense_date=d).aggregate(t=Sum("amount"))["t"] or 0)}
            for d in last_7
        ]

        return Response({
            "date_from": date_from,
            "date_to": date_to,
            "cards": {
                "revenue": str(total_revenue),
                "expenses": str(total_expenses),
                "profit": str(profit),
                "outstanding_bills": str(outstanding),
                "cancelled_bills_total": str(cancelled_total),
                "cancelled_bills_count": cancelled_bills.count(),
                "refunds_total": str(refunds_total),
                "refunds_count": refunds_in_range.count(),
                "leakage_total": str(leakage_total),
            },
            "best_doctor": {
                "name": f"{best_doctor['visit__doctor__first_name']} {best_doctor['visit__doctor__last_name']}",
                "revenue": str(best_doctor["total"]),
                "patients": best_doctor["patient_count"],
            } if best_doctor else None,
            "worst_department": {
                "name": worst_department["visit__department__name"] or "Unknown",
                "revenue": str(worst_department["total"] or 0),
                "patients": worst_department["patient_count"],
            } if worst_department else None,
            "department_ranking": [
                {"name": d["visit__department__name"] or "Unknown", "value": float(d["total"] or 0)} for d in best_department_by_rev
            ],
            "top_drugs": [{"name": d["prescription__medicine__name"], "value": d["total_qty"]} for d in top_drugs],
            "payment_methods": [{"name": m["method"], "value": float(m["total"] or 0)} for m in by_method],
            "sha_pending": {"amount": str(sha_pending["t"] or 0), "count": sha_pending["c"] or 0},
            "insurance_pending": {"amount": str(all_insurance_pending["t"] or 0), "count": all_insurance_pending["c"] or 0},
            "revenue_trend_7d": revenue_trend,
            "expense_trend_7d": expense_trend,
        })