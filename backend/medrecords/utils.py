import uuid
from django.utils import timezone

def _gen(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def generate_file_number(): return _gen("MRF")
def generate_birth_reg_number(): return _gen("BR")
def generate_death_reg_number(): return _gen("DR")
def generate_referral_number(): return _gen("REF")
def generate_request_number(): return _gen("RRQ")