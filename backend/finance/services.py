from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum

from .models import JournalEntry, JournalEntryLine, JournalEntryStatus


def post_journal_entry(entry_id, user=None):
    """Posts a draft entry — requires it to be balanced (debits == credits)."""
    entry = JournalEntry.objects.select_related().prefetch_related("lines").get(pk=entry_id)
    if entry.status != JournalEntryStatus.DRAFT:
        raise ValueError("Only draft entries can be posted.")
    if not entry.is_balanced:
        raise ValueError(f"Entry is not balanced: Dr {entry.total_debit} vs Cr {entry.total_credit}.")

    entry.status = JournalEntryStatus.POSTED
    entry.posted_by = user
    entry.posted_at = timezone.now()
    entry.save(update_fields=["status", "posted_by", "posted_at"])
    return entry


def create_and_post_entry(entry_date, description, lines, source="MANUAL", reference="", user=None):
    """
    lines: list of {"account": account_id, "debit": Decimal, "credit": Decimal, "description": str}
    Convenience for auto-posting from other services (e.g. daily revenue sync).
    """
    with transaction.atomic():
        entry = JournalEntry.objects.create(
            entry_date=entry_date, description=description, source=source,
            reference=reference, created_by=user,
        )
        for line in lines:
            JournalEntryLine.objects.create(
                entry=entry, account_id=line["account"],
                debit=line.get("debit", 0), credit=line.get("credit", 0),
                description=line.get("description", ""),
            )
        return post_journal_entry(entry.id, user=user)


def sync_daily_patient_revenue(target_date, cash_account_id, revenue_account_id, user=None):
    """
    Reads api.Payment for a given date and posts a single summarized journal
    entry: Debit Cash, Credit Patient Revenue. Read-only against Payment —
    doesn't modify billing data, just reflects it into the ledger. Safe to
    call once per day; if an entry already exists for that date+source it's
    skipped to avoid duplicate posting.
    """
    from api.models import Payment

    if JournalEntry.objects.filter(entry_date=target_date, source="PATIENT_REVENUE").exists():
        return None

    total = Payment.objects.filter(paid_at__date=target_date).aggregate(
        t=__import__("django.db.models", fromlist=["Sum"]).Sum("amount")
    )["t"] or Decimal("0")

    if total <= 0:
        return None

    return create_and_post_entry(
        entry_date=target_date,
        description=f"Daily patient revenue - {target_date}",
        lines=[
            {"account": cash_account_id, "debit": total, "credit": 0},
            {"account": revenue_account_id, "debit": 0, "credit": total},
        ],
        source="PATIENT_REVENUE", reference=str(target_date), user=user,
    )