import random
import uuid


def _dicom_uid():
    """Generates a syntactically valid-looking DICOM UID (dotted numeric OID style) — matches the real format even though it's not registered under a real organization root."""
    root = "2.25"  # 2.25 is the standard "unregistered UUID-derived UID" DICOM root, real convention for generated UIDs
    return f"{root}.{uuid.uuid4().int}"


def generate_study_instance_uid():
    return _dicom_uid()


def generate_series_instance_uid():
    return _dicom_uid()


def generate_sop_instance_uid():
    return _dicom_uid()


def generate_accession_number():
    return f"ACC-{random.randint(10000000, 99999999)}"