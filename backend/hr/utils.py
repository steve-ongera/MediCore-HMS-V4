import uuid
from django.utils import timezone


def generate_employee_number():
    return f"EMP-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"