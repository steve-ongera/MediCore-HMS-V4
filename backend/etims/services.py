import logging

from .gateways.kra import KRAETIMSGateway
from .models import FiscalizedReceipt, FiscalizedReceiptItem, FiscalizationStatus, FiscalizationConfig

logger = logging.getLogger(__name__)


def get_active_config():
    return FiscalizationConfig.objects.filter(is_active=True).first()


def fiscalize_payment(payment, user=None):
    """
    Fiscalizes a hospital Payment. One receipt, one line item taken from the
    underlying Invoice's description/amount — matches how Invoice is
    modeled in this system (one amount + description per billable event,
    not a multi-line invoice).
    """
    if hasattr(payment, "fiscalized_receipt"):
        return payment.fiscalized_receipt

    config = get_active_config()
    default_vat = config.default_vat_category if config else "A"

    receipt = FiscalizedReceipt.objects.create(payment=payment, triggered_by=user)
    FiscalizedReceiptItem.objects.create(
        receipt=receipt,
        description=payment.invoice.description,
        quantity=1,
        unit_price=payment.amount,
        vat_category=default_vat,
        line_total=payment.amount,
    )
    return _send_to_kra(receipt)


def fiscalize_otc_sale(otc_sale, user=None):
    """Fiscalizes a walk-in pharmacy OTCSale, one line per OTCSaleItem."""
    if hasattr(otc_sale, "fiscalized_receipt"):
        return otc_sale.fiscalized_receipt

    config = get_active_config()
    default_vat = config.default_vat_category if config else "A"

    receipt = FiscalizedReceipt.objects.create(otc_sale=otc_sale, triggered_by=user)
    for item in otc_sale.items.select_related("medicine"):
        FiscalizedReceiptItem.objects.create(
            receipt=receipt,
            description=item.medicine.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            vat_category=default_vat,
            line_total=item.subtotal,
        )
    return _send_to_kra(receipt)


def _send_to_kra(receipt):
    gateway = KRAETIMSGateway()
    try:
        result = gateway.fiscalize(receipt)
    except Exception as exc:
        logger.exception("eTIMS fiscalization failed for %s.", receipt.source_description)
        receipt.status = FiscalizationStatus.FAILED
        receipt.failure_reason = str(exc)
        receipt.retry_count += 1
        receipt.save(update_fields=["status", "failure_reason", "retry_count"])
        return receipt

    from django.utils import timezone

    if result.get("success"):
        receipt.status = FiscalizationStatus.FISCALIZED
        receipt.kra_invoice_number = result.get("kra_invoice_number", "")
        receipt.cu_invoice_number = result.get("cu_invoice_number", "")
        receipt.qr_code_url = result.get("qr_code_url", "")
        receipt.cu_signature = result.get("cu_signature", "")
        receipt.fiscalized_at = timezone.now()
        receipt.raw_response = result.get("raw", {})
        receipt.save(update_fields=[
            "status", "kra_invoice_number", "cu_invoice_number", "qr_code_url",
            "cu_signature", "fiscalized_at", "raw_response",
        ])
    else:
        receipt.status = FiscalizationStatus.FAILED
        receipt.failure_reason = str(result.get("raw", ""))
        receipt.retry_count += 1
        receipt.save(update_fields=["status", "failure_reason", "retry_count"])

    return receipt


def retry_fiscalization(receipt):
    if receipt.status == FiscalizationStatus.FISCALIZED:
        return receipt
    return _send_to_kra(receipt)