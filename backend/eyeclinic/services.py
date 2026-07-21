from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_eyeclinic_visit(patient, registered_by=None):
    dept, _ = Department.objects.get_or_create(
        name="Eye Clinic",
        defaults={"consultation_fee": 0, "description": "Auto-created department for eye clinic services."},
    )
    return Visit.objects.create(
        patient=patient, department=dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_eyeclinic_invoice(patient, visit, description, amount):
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,
        description=description, amount=amount,
    )