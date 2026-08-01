from datetime import date, timedelta
from decimal import Decimal
from statistics import mean, pstdev

from django.db.models import Sum, Count
from django.utils import timezone

from api.models import Payment, OTCSale, LabOrder, MedicineBatch, StockTransaction, StockTransactionType, PharmacyDispense
from .models import BusinessInsight, InsightCategory, InsightSeverity


def _week_total(start_offset_days):
    """Sum of hospital + OTC revenue for a 7-day window ending `start_offset_days` days ago."""
    end = date.today() - timedelta(days=start_offset_days)
    start = end - timedelta(days=6)
    hospital = Payment.objects.filter(paid_at__date__gte=start, paid_at__date__lte=end).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    otc = OTCSale.objects.filter(sold_at__date__gte=start, sold_at__date__lte=end).aggregate(t=Sum("amount_paid"))["t"] or Decimal("0")
    return hospital + otc


def detect_revenue_trend():
    """"Pharmacy sales dropped 18% compared to last week." style insight, generalized to overall + pharmacy-specific revenue."""
    insights = []

    this_week = _week_total(0)
    last_week = _week_total(7)
    if last_week > 0:
        pct_change = float((this_week - last_week) / last_week * 100)
        if pct_change <= -10:
            insights.append(BusinessInsight(
                category=InsightCategory.REVENUE, severity=InsightSeverity.WARNING,
                headline=f"Overall revenue dropped {abs(pct_change):.0f}% compared to last week.",
                detail=f"This week: KES {this_week:,.0f}. Last week: KES {last_week:,.0f}.",
                metrics={"this_week": str(this_week), "last_week": str(last_week), "pct_change": round(pct_change, 1)},
            ))
        elif pct_change >= 15:
            insights.append(BusinessInsight(
                category=InsightCategory.REVENUE, severity=InsightSeverity.INFO,
                headline=f"Revenue is up {pct_change:.0f}% compared to last week.",
                detail=f"This week: KES {this_week:,.0f}. Last week: KES {last_week:,.0f}.",
                metrics={"this_week": str(this_week), "last_week": str(last_week), "pct_change": round(pct_change, 1)},
            ))

    # Pharmacy-specific
    today = date.today()
    this_week_start = today - timedelta(days=6)
    last_week_start = today - timedelta(days=13)
    last_week_end = today - timedelta(days=7)

    pharm_this = PharmacyDispense.objects.filter(dispensed_at__date__gte=this_week_start).count() + \
                 OTCSale.objects.filter(sold_at__date__gte=this_week_start).count()
    pharm_last = PharmacyDispense.objects.filter(dispensed_at__date__gte=last_week_start, dispensed_at__date__lte=last_week_end).count() + \
                 OTCSale.objects.filter(sold_at__date__gte=last_week_start, sold_at__date__lte=last_week_end).count()

    if pharm_last > 0:
        pct = (pharm_this - pharm_last) / pharm_last * 100
        if pct <= -15:
            insights.append(BusinessInsight(
                category=InsightCategory.PHARMACY, severity=InsightSeverity.WARNING,
                headline=f"Pharmacy sales volume dropped {abs(pct):.0f}% compared to last week.",
                detail=f"This week: {pharm_this} transactions. Last week: {pharm_last} transactions.",
                metrics={"this_week_count": pharm_this, "last_week_count": pharm_last, "pct_change": round(pct, 1)},
            ))

    return insights


def detect_doctor_ordering_anomalies():
    """"Dr. Kamau requests CBC tests 3x more than other doctors." — flags any doctor whose test-ordering rate is a statistical outlier vs peers."""
    from api.models import User, Role

    insights = []
    cutoff = date.today() - timedelta(days=30)
    doctors = User.objects.filter(role=Role.DOCTOR, is_active_staff=True)

    order_counts = {}
    for doc in doctors:
        count = LabOrder.objects.filter(ordered_by=doc, ordered_at__date__gte=cutoff).count()
        if count > 0:
            order_counts[doc] = count

    if len(order_counts) < 3:
        return insights  # not enough doctors for a meaningful comparison

    values = list(order_counts.values())
    avg = mean(values)
    if avg == 0:
        return insights

    for doc, count in order_counts.items():
        ratio = count / avg
        if ratio >= 2.5 and count >= 10:  # meaningfully above peers AND a real sample size, not noise
            insights.append(BusinessInsight(
                category=InsightCategory.STAFFING, severity=InsightSeverity.INFO,
                headline=f"Dr. {doc.get_full_name()} orders lab tests at {ratio:.1f}x the average rate of peers.",
                detail=f"{count} lab orders in the last 30 days vs a peer average of {avg:.1f}.",
                metrics={"doctor_id": str(doc.id), "count": count, "peer_average": round(avg, 1), "ratio": round(ratio, 2)},
            ))

    return insights


def detect_stockout_predictions():
    """"Drug X will be out of stock in 4 days." — computes daily consumption velocity per medicine and projects days until zero."""
    from api.models import Medicine

    insights = []
    cutoff = date.today() - timedelta(days=14)

    for medicine in Medicine.objects.all():
        current_stock = MedicineBatch.objects.filter(medicine=medicine).aggregate(t=Sum("quantity_remaining"))["t"] or 0
        if current_stock <= 0:
            continue  # already flagged as out of stock elsewhere; not a "prediction"

        consumed = StockTransaction.objects.filter(
            medicine=medicine, transaction_type=StockTransactionType.STOCK_OUT,
            created_at__date__gte=cutoff,
        ).aggregate(t=Sum("quantity"))["t"] or 0

        if consumed <= 0:
            continue

        daily_rate = consumed / 14
        if daily_rate <= 0:
            continue

        days_remaining = current_stock / daily_rate
        if days_remaining <= 7:
            severity = InsightSeverity.CRITICAL if days_remaining <= 3 else InsightSeverity.WARNING
            insights.append(BusinessInsight(
                category=InsightCategory.INVENTORY, severity=severity,
                headline=f"{medicine.name} will be out of stock in approximately {days_remaining:.0f} day(s).",
                detail=f"Current stock: {current_stock} units. Average consumption: {daily_rate:.1f} units/day over the last 14 days.",
                metrics={"medicine_id": str(medicine.id), "current_stock": current_stock, "daily_rate": round(daily_rate, 2), "days_remaining": round(days_remaining, 1)},
            ))

    return insights


def detect_day_of_week_pattern():
    """"Revenue has reduced every Monday." — checks each weekday's average revenue over the last 8 weeks against the overall average."""
    insights = []
    weekday_totals = {i: [] for i in range(7)}  # 0=Monday .. 6=Sunday

    for weeks_back in range(8):
        for day_offset in range(7):
            d = date.today() - timedelta(days=weeks_back * 7 + day_offset)
            total = Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or Decimal("0")
            weekday_totals[d.weekday()].append(float(total))

    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    all_values = [v for values in weekday_totals.values() for v in values]
    if not all_values:
        return insights
    overall_avg = mean(all_values)
    if overall_avg == 0:
        return insights

    for weekday, values in weekday_totals.items():
        if len(values) < 4:
            continue
        day_avg = mean(values)
        pct_diff = (day_avg - overall_avg) / overall_avg * 100
        if pct_diff <= -25:
            insights.append(BusinessInsight(
                category=InsightCategory.PATTERN, severity=InsightSeverity.INFO,
                headline=f"Revenue is consistently {abs(pct_diff):.0f}% below average on {weekday_names[weekday]}s.",
                detail=f"{weekday_names[weekday]} average: KES {day_avg:,.0f}. Overall daily average: KES {overall_avg:,.0f}.",
                metrics={"weekday": weekday_names[weekday], "day_average": round(day_avg, 2), "overall_average": round(overall_avg, 2), "pct_diff": round(pct_diff, 1)},
            ))

    return insights


INSIGHT_GENERATORS = [
    detect_revenue_trend,
    detect_doctor_ordering_anomalies,
    detect_stockout_predictions,
    detect_day_of_week_pattern,
]


def generate_insights():
    """Marks all prior insights stale, then regenerates fresh ones — keeps the feed current without deleting history."""
    BusinessInsight.objects.filter(is_stale=False).update(is_stale=True)

    created = []
    for generator in INSIGHT_GENERATORS:
        try:
            for insight in generator():
                insight.save()
                created.append(insight)
        except Exception:
            import logging
            logging.getLogger("insights").exception(f"Insight generator {generator.__name__} failed.")
            continue

    return created