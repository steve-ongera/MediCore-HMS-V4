import uuid
from django.utils import timezone


def generate_dispatch_number():
    return f"AMB-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"