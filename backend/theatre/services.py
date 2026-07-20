from api.models import (
    Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType,
)


def ensure_theatre_visit(patient, registered_by=None):
    theatre_dept, _ = Department.objects.get_or_create(
        name="Theatre / Surgical Services",
        defaults={"consultation_fee": 0, "description": "Auto-created department for theatre billing."},
    )
    return Visit.objects.create(
        patient=patient, department=theatre_dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_theatre_invoice(patient, description, amount, user=None):
    visit = ensure_theatre_visit(patient, registered_by=user)
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,
        description=description, amount=amount,
    )


def compute_theatre_time_charge(surgery):
    hours = surgery.duration_hours
    return round(hours * float(surgery.theatre.hourly_rate), 2)