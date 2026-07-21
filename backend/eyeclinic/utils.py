import uuid
from django.utils import timezone


def generate_eye_visit_number():
    return f"EYE-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"