import uuid
from django.utils import timezone


def generate_booking_number():
    return f"SRG-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"