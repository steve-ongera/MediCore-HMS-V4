"""
Auto-fiscalizes the moment a Payment or OTCSale is created — the real
point-of-sale tax events in this HMIS. Mirrors the inpatient bed-charge
signal pattern already used elsewhere in this codebase: fire on creation,
fail safe (never block the underlying Payment/OTCSale if KRA is
unreachable), and leave a retry path via the manual "Retry" action for
anything that lands in FAILED.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models import Payment, OTCSale

logger = logging.getLogger(__name__) 


@receiver(post_save, sender=Payment)
def fiscalize_payment_on_creation(sender, instance, created, **kwargs):
    if not created:
        return
    from .services import fiscalize_payment
    try:
        fiscalize_payment(instance)
    except Exception:
        logger.exception("Failed to auto-fiscalize payment %s.", instance.receipt_number)


@receiver(post_save, sender=OTCSale)
def fiscalize_otc_sale_on_creation(sender, instance, created, **kwargs):
    if not created:
        return
    # OTCSale is created empty then populated with items in the same
    # transaction inside OTCSaleViewSet.create — fiscalizing here would run
    # before items exist. Skip signal-based fiscalization for OTCSale;
    # OTCSaleViewSet.create fires it explicitly after items are attached
    # (see the one-line hook noted in step 8 below).
    return