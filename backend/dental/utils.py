import uuid
from django.utils import timezone


def generate_dental_visit_number():
    return f"DNT-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"