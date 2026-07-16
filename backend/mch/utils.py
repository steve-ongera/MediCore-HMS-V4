import uuid
from django.utils import timezone


def generate_anc_number():
    return f"ANC-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_delivery_number():
    return f"DEL-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_child_number():
    return f"CHD-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"