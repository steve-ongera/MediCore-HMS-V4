import uuid
from django.utils import timezone


def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_entry_number():
    return _gen("JE")


def generate_expense_number():
    return _gen("EXP")