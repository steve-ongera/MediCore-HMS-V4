"""
Lightweight in-process scheduler for inpatient billing automation.

Runs inside the same process as the Django server using APScheduler's
BackgroundScheduler — no external cron or OS task scheduler required.

Job: generate_daily_bed_charges — fires once immediately on server startup
(catches admissions from before the server was last restarted, missed days,
etc.) and then every 24 hours after that, for as long as the server runs.

The manual "Generate Today's Charges" button (BedChargeViewSet.generate_today)
still exists as a fallback/manual override — this scheduler just means nobody
has to remember to click it.
"""
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

def _run_leakage_scan_job():
    from leakage.services import run_leakage_scan
    try:
        log = run_leakage_scan()
        if log.new_leaks_found:
            logger.warning(f"Leakage scan found {log.new_leaks_found} new unbilled events, total open: KES {log.total_leaked_amount}")
    except Exception:
        logger.exception("Scheduled leakage scan failed.")

def start():
    global _scheduler
    if _scheduler is not None:
        return  # already running in this process

    _scheduler = BackgroundScheduler(daemon=True)

    # Daily inpatient bed charges
    _scheduler.add_job(
        _run_bed_charges_job,
        trigger=IntervalTrigger(hours=24),
        id="generate_daily_bed_charges",
        replace_existing=True,
    )

    # Hourly revenue leakage scan
    _scheduler.add_job(
        _run_leakage_scan_job,
        trigger=IntervalTrigger(hours=1),
        id="revenue_leakage_scan",
        replace_existing=True,
    )

    _scheduler.start()

    # Run immediately on startup
    _run_bed_charges_job()
    _run_leakage_scan_job()

    logger.info(
        "Inpatient background scheduler started "
        "(bed charges every 24h, revenue leakage scan every 1h)."
    )