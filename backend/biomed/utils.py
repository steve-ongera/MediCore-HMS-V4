import uuid
from django.utils import timezone

def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def generate_asset_tag(): return _gen("BME")
def generate_request_number(): return _gen("SVC")