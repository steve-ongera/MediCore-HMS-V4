import uuid
from django.utils import timezone


def generate_claim_number():
    return f"CLM-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"