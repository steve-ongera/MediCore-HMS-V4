import uuid
from django.utils import timezone


def generate_case_number():
    return f"MRT-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"