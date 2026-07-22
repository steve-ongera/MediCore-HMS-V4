import uuid
from django.utils import timezone


def generate_icu_admission_number():
    return f"ICU-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"