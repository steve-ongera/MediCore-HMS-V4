#scheduler.py
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler = None


def _run_bed_charges_job():
    from .services import generate_daily_bed_charges
    try:
        created = generate_daily_bed_charges()
        if created:
            logger.info("Auto-generated %d bed charge(s).", len(created))
    except Exception:
        logger.exception("Scheduled bed charge generation failed.")


# NEW: ICU/HDU bed charges — same pattern as inpatient bed charges
def _run_icu_bed_charges_job():
    from icu.services import generate_daily_icu_bed_charges
    try:
        created = generate_daily_icu_bed_charges()
        if created:
            logger.info("Auto-generated %d ICU bed charge(s).", len(created))
    except Exception:
        logger.exception("Scheduled ICU bed charge generation failed.")


def _run_emergency_bay_charges_job():
    from emergency.services import generate_pending_bay_charges
    try:
        created = generate_pending_bay_charges()
        if created:
            logger.info("Auto-generated %d ED bay charge(s).", len(created))
    except Exception:
        logger.exception("Scheduled ED bay charge generation failed.")



def _run_leakage_scan_job():
    from leakage.services import run_leakage_scan
    try:
        log = run_leakage_scan()
        if log.new_leaks_found:
            logger.warning(
                f"Leakage scan found {log.new_leaks_found} new unbilled events, "
                f"total open: KES {log.total_leaked_amount}"
            )
    except Exception:
        logger.exception("Scheduled leakage scan failed.")


def generate_insights_job():
    from insights.services import generate_insights
    try:
        generate_insights()
    except Exception:
        logger.exception("Scheduled insight generation failed.")


# NEW: Password staleness check
def _check_stale_passwords_job():
    from datetime import timedelta
    from django.utils import timezone
    from api.models import User
    from notifications.services import notify
    from notifications.models import (
        NotificationType,
        NotificationCategory,
        NotificationPriority,
    )

    cutoff = timezone.now() - timedelta(days=30)

    stale_users = User.objects.filter(
        password_changed_at__lt=cutoff,
        is_active_staff=True,
    )

    for user in stale_users:
        already_notified = user.notifications.filter(
            notification_type=NotificationType.PASSWORD_STALE,
            created_at__gte=cutoff,
        ).exists()

        if not already_notified:
            notify(
                user,
                NotificationType.PASSWORD_STALE,
                "Your password is over 30 days old",
                "For security, consider changing your password soon.",
                link="/profile",
                priority=NotificationPriority.NORMAL,
                category=NotificationCategory.SECURITY,
            )


def start():
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(daemon=True)

    _scheduler.add_job(
        _run_bed_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_bed_charges",
        replace_existing=True,
    )

    _scheduler.add_job(
        _run_icu_bed_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_icu_bed_charges",
        replace_existing=True,
    )

    # NEW: ED bay-time top-up, hourly — ED stays are measured in hours, not days
    _scheduler.add_job(
        _run_emergency_bay_charges_job,
        trigger=IntervalTrigger(hours=1),
        id="generate_pending_emergency_bay_charges",
        replace_existing=True,
    )

    _scheduler.add_job(
        _run_leakage_scan_job,
        trigger=IntervalTrigger(hours=1),
        id="revenue_leakage_scan",
        replace_existing=True,
    )

    _scheduler.add_job(
        lambda: generate_insights_job(),
        trigger=IntervalTrigger(hours=6),
        id="business_insights",
        replace_existing=True,
    )

    _scheduler.add_job(
        _check_stale_passwords_job,
        trigger=IntervalTrigger(hours=24),
        id="password_staleness_check",
        replace_existing=True,
    )

    _scheduler.start()

    # Run immediately on startup
    _run_bed_charges_job()
    _run_icu_bed_charges_job()
    _run_emergency_bay_charges_job()  # NEW
    _run_leakage_scan_job()
    generate_insights_job()
    _check_stale_passwords_job()

    logger.info(
        "Background scheduler started "
        "(bed charges: 24h, ICU bed charges: 24h, ED bay charges: 1h, leakage scan: 1h, business insights: 6h)."
    )