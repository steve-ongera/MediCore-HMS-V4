from security.utils import get_client_ip


def log_record_access(patient, action, user, request=None, detail=""):
    """The single function every view that touches a patient's medical record should call — matches the security audit log discipline."""
    from .models import RecordAuditTrail
    ip = get_client_ip(request) if request else None
    return RecordAuditTrail.objects.create(patient=patient, action=action, performed_by=user, detail=detail, ip_address=ip)