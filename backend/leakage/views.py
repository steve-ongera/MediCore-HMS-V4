from datetime import date, timedelta

from django.db.models import Sum, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from api.permissions import IsCashierOrAccountant

from .models import RevenueLeakageRecord, LeakageStatus, LeakageSourceType, LeakageScanLog
from .serializers import RevenueLeakageRecordSerializer, LeakageScanLogSerializer, WriteOffLeakSerializer
from .services import run_leakage_scan, resolve_leak_with_invoice


class RevenueLeakageRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only by design for the raw list — resolution happens through the
    dedicated resolve/write-off actions below, never a generic PATCH, so
    every state change is auditable through those explicit endpoints.
    """
    queryset = RevenueLeakageRecord.objects.select_related("resolved_invoice", "resolved_by").all()
    serializer_class = RevenueLeakageRecordSerializer
    permission_classes = [IsCashierOrAccountant]
    filterset_fields = ["status", "source_type"]
    search_fields = ["patient_name", "hospital_number", "description"]

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        leak = self.get_object()
        if leak.status != LeakageStatus.OPEN:
            raise ValidationError({"detail": "This leak has already been resolved or written off."})
        leak = resolve_leak_with_invoice(leak, user=request.user)
        return Response(RevenueLeakageRecordSerializer(leak).data)

    @action(detail=True, methods=["post"], url_path="write-off")
    def write_off(self, request, pk=None):
        leak = self.get_object()
        if leak.status != LeakageStatus.OPEN:
            raise ValidationError({"detail": "This leak has already been resolved or written off."})
        serializer = WriteOffLeakSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leak.status = LeakageStatus.WRITTEN_OFF
        leak.write_off_reason = serializer.validated_data["reason"]
        leak.resolved_by = request.user
        from django.utils import timezone
        leak.resolved_at = timezone.now()
        leak.save()
        return Response(RevenueLeakageRecordSerializer(leak).data)

    @action(detail=False, methods=["post"], url_path="scan-now")
    def scan_now(self, request):
        log = run_leakage_scan(user=request.user)
        return Response(LeakageScanLogSerializer(log).data)


class LeakageDashboardView(APIView):
    """
    GET /api/leakage/dashboard/
    Powers the summary cards: total lost today, breakdown by source type,
    and a trend for the last 7 days.
    """
    permission_classes = [IsCashierOrAccountant]

    def get(self, request):
        today = date.today()
        open_leaks = RevenueLeakageRecord.objects.filter(status=LeakageStatus.OPEN)

        today_leaks = open_leaks.filter(event_date__date=today)
        today_total = today_leaks.aggregate(t=Sum("expected_amount"))["t"] or 0

        by_source = list(
            today_leaks.values("source_type").annotate(total=Sum("expected_amount"), count=Count("id")).order_by("-total")
        )

        all_time_total = open_leaks.aggregate(t=Sum("expected_amount"))["t"] or 0

        last_7 = [today - timedelta(days=i) for i in range(6, -1, -1)]
        trend = [
            {"name": d.isoformat(), "value": float(
                RevenueLeakageRecord.objects.filter(event_date__date=d, status=LeakageStatus.OPEN).aggregate(t=Sum("expected_amount"))["t"] or 0
            )}
            for d in last_7
        ]

        last_scan = LeakageScanLog.objects.order_by("-started_at").first()

        return Response({
            "today_total_leaked": str(today_total),
            "today_leak_count": today_leaks.count(),
            "all_time_open_total": str(all_time_total),
            "all_time_open_count": open_leaks.count(),
            "by_source_today": [{"name": r["source_type"], "value": float(r["total"]), "count": r["count"]} for r in by_source],
            "trend_7_days": trend,
            "last_scan": LeakageScanLogSerializer(last_scan).data if last_scan else None,
        })