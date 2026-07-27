import uuid
from django.utils import timezone


def generate_transfer_number():
    return f"XFR-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_count_number():
    return f"CNT-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"