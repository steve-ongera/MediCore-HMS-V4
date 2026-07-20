import uuid
from django.utils import timezone


def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_donor_number():
    return _gen("DNR")


def generate_donation_number():
    return _gen("DON")


def generate_unit_number():
    return _gen("BU")


def generate_request_number():
    return _gen("BRQ")