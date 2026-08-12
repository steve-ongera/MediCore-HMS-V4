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


# ICU/HDU bed charges
def _run_icu_bed_charges_job():
    from icu.services import generate_daily_icu_bed_charges

    try:
        created = generate_daily_icu_bed_charges()
        if created:
            logger.info("Auto-generated %d ICU bed charge(s).", len(created))
    except Exception:
        logger.exception("Scheduled ICU bed charge generation failed.")


# Emergency Department bay charges
def _run_emergency_bay_charges_job():
    from emergency.services import generate_pending_bay_charges

    try:
        created = generate_pending_bay_charges()
        if created:
            logger.info("Auto-generated %d ED bay charge(s).", len(created))
    except Exception:
        logger.exception("Scheduled ED bay charge generation failed.")


# Mortuary storage charges
def _run_mortuary_storage_charges_job():
    from mortuary.services import generate_daily_mortuary_storage_charges

    try:
        created = generate_daily_mortuary_storage_charges()
        if created:
            logger.info(
                "Auto-generated %d mortuary storage invoice(s).",
                len(created),
            )
    except Exception:
        logger.exception(
            "Scheduled mortuary storage charge generation failed."
        )


# Revenue leakage scan
def _run_leakage_scan_job():
    from leakage.services import run_leakage_scan

    try:
        log = run_leakage_scan()

        if log.new_leaks_found:
            logger.warning(
                "Leakage scan found %d new unbilled events, "
                "total open: KES %s",
                log.new_leaks_found,
                log.total_leaked_amount,
            )
    except Exception:
        logger.exception("Scheduled leakage scan failed.")


# Business insights generation
def generate_insights_job():
    from insights.services import generate_insights

    try:
        generate_insights()
    except Exception:
        logger.exception("Scheduled insight generation failed.")


# Password staleness check
def _check_stale_passwords_job():
    from datetime import timedelta

    from django.utils import timezone

    from api.models import User
    from notifications.models import (
        NotificationCategory,
        NotificationPriority,
        NotificationType,
    )
    from notifications.services import notify

    try:
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

    except Exception:
        logger.exception("Scheduled password staleness check failed.")


# NEW: Follow-up status refresh
def _refresh_followup_statuses_job():
    from carecoordination.services import refresh_task_statuses

    try:
        result = refresh_task_statuses()
        logger.info("Follow-up status refresh: %s", result)
    except Exception:
        logger.exception("Follow-up status refresh failed.")


# NEW: Follow-up reminders
def _send_followup_reminders_job():
    from carecoordination.services import send_pending_reminders

    try:
        count = send_pending_reminders()
        logger.info("Sent %d follow-up reminders.", count)
    except Exception:
        logger.exception("Follow-up reminders job failed.")


def start():
    global _scheduler

    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(daemon=True)

    # ---------------------------------------------------------
    # Inpatient bed charges — every 24 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _run_bed_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_bed_charges",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # ICU/HDU bed charges — every 24 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _run_icu_bed_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_icu_bed_charges",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Emergency Department bay charges — every 1 hour
    # ---------------------------------------------------------
    _scheduler.add_job(
        _run_emergency_bay_charges_job,
        trigger=IntervalTrigger(hours=1),
        id="generate_pending_emergency_bay_charges",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Mortuary storage charges — every 24 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _run_mortuary_storage_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_mortuary_storage_charges",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Revenue leakage scan — every 1 hour
    # ---------------------------------------------------------
    _scheduler.add_job(
        _run_leakage_scan_job,
        trigger=IntervalTrigger(hours=1),
        id="revenue_leakage_scan",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Business insights — every 6 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        generate_insights_job,
        trigger=IntervalTrigger(hours=6),
        id="business_insights",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Password staleness check — every 24 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _check_stale_passwords_job,
        trigger=IntervalTrigger(hours=24),
        id="password_staleness_check",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Follow-up task status refresh — every 6 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _refresh_followup_statuses_job,
        trigger=IntervalTrigger(hours=6),
        id="followup_status_refresh",
        replace_existing=True,
    )

    # ---------------------------------------------------------
    # Follow-up reminders — every 12 hours
    # ---------------------------------------------------------
    _scheduler.add_job(
        _send_followup_reminders_job,
        trigger=IntervalTrigger(hours=12),
        id="followup_reminders",
        replace_existing=True,
    )

    # Start scheduler
    _scheduler.start()

    # ---------------------------------------------------------
    # Run important jobs immediately on startup
    # ---------------------------------------------------------
    # This ensures records that were created while the server or
    # scheduler was offline are processed without waiting for the
    # next scheduled interval.

    _run_bed_charges_job()
    _run_icu_bed_charges_job()
    _run_emergency_bay_charges_job()
    _run_mortuary_storage_charges_job()
    _run_leakage_scan_job()
    generate_insights_job()
    _check_stale_passwords_job()

    # Follow-up jobs
    _refresh_followup_statuses_job()
    _send_followup_reminders_job()

    logger.info(
        "Background scheduler started "
        "(bed charges: 24h, ICU bed charges: 24h, "
        "ED bay charges: 1h, mortuary storage: 24h, "
        "leakage scan: 1h, business insights: 6h, "
        "password staleness: 24h, follow-up status refresh: 6h, "
        "follow-up reminders: 12h)."
    )


