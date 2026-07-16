import uuid
from django.utils import timezone


def generate_emergency_visit_number():
    return f"ED-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"