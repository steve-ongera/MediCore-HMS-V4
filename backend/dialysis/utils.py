import uuid
from django.utils import timezone


def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_profile_number():
    return _gen("DLY")


def generate_session_number():
    return _gen("DSN")