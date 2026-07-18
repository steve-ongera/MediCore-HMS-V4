import uuid
from django.utils import timezone


def generate_asset_tag():
    return f"AST-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"