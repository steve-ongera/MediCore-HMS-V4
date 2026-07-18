import uuid
from django.utils import timezone


def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_requisition_number():
    return _gen("REQ")


def generate_po_number():
    return _gen("PO")


def generate_grn_number():
    return _gen("GRN")


def generate_supplier_invoice_number():
    return _gen("SINV")


def generate_supplier_payment_number():
    return _gen("SPAY")