from django.db import transaction

from .models import StoreStock, TransferStatus


def get_or_create_stock(location, medicine):
    stock, _ = StoreStock.objects.get_or_create(location=location, medicine=medicine, defaults={"quantity_on_hand": 0})
    return stock


def adjust_stock(location, medicine, delta):
    stock = get_or_create_stock(location, medicine)
    stock.quantity_on_hand += delta
    stock.save(update_fields=["quantity_on_hand"])
    return stock


@transaction.atomic
def dispatch_transfer(transfer, dispatched_items, user):
    """
    dispatched_items: {item_id: quantity_dispatched}. Deducts stock from
    from_location immediately at dispatch time — the sender is now
    accountable for having actually removed what they say they removed.
    """
    for item in transfer.items.select_related("medicine"):
        qty = dispatched_items.get(str(item.id))
        if qty is None:
            continue
        item.quantity_dispatched = qty
        item.save(update_fields=["quantity_dispatched"])
        adjust_stock(transfer.from_location, item.medicine, -qty)

    transfer.status = TransferStatus.DISPATCHED
    transfer.dispatched_by = user
    from django.utils import timezone
    transfer.dispatched_at = timezone.now()
    transfer.save(update_fields=["status", "dispatched_by", "dispatched_at"])
    return transfer


@transaction.atomic
def receive_transfer(transfer, received_items, user):
    """
    received_items: {item_id: quantity_received}. Adds stock to
    to_location based on what the RECEIVER independently counted — not
    what the sender claimed to dispatch. Any mismatch between dispatched
    and received is flagged as DISCREPANCY, the hospital's automatic
    theft-in-transit signal.
    """
    has_discrepancy = False
    for item in transfer.items.select_related("medicine"):
        qty = received_items.get(str(item.id))
        if qty is None:
            continue
        item.quantity_received = qty
        item.save(update_fields=["quantity_received"])
        adjust_stock(transfer.to_location, item.medicine, qty)
        if item.has_discrepancy:
            has_discrepancy = True

    transfer.status = TransferStatus.DISCREPANCY if has_discrepancy else TransferStatus.RECEIVED
    transfer.received_by = user
    from django.utils import timezone
    transfer.received_at = timezone.now()
    transfer.save(update_fields=["status", "received_by", "received_at"])
    return transfer


@transaction.atomic
def approve_stock_count(stock_count, user):
    """Applies counted quantities to the ledger — StoreStock now reflects reality, and every variance line is preserved as a permanent record, even after adjustment."""
    for line in stock_count.lines.select_related("medicine"):
        stock = get_or_create_stock(stock_count.location, line.medicine)
        stock.quantity_on_hand = line.counted_quantity
        stock.save(update_fields=["quantity_on_hand"])

    from .models import StockCountStatus
    stock_count.status = StockCountStatus.APPROVED
    stock_count.approved_by = user
    from django.utils import timezone
    stock_count.approved_at = timezone.now()
    stock_count.save(update_fields=["status", "approved_by", "approved_at"])
    return stock_count