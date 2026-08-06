#theatre/services.py
from api.models import (
    Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType,
)


def ensure_theatre_visit(surgery):
    """
    Guarantees this surgery has a Visit, creating one lazily if needed.
    Reused across every charge on this surgery (consumables, time charge,
    team fees) — mirrors inpatient/ICU's ensure_*_visit. Fixes the old
    behavior where every raise_theatre_invoice call spawned a new Visit.
    """
    if surgery.visit:
        return surgery.visit

    theatre_dept, _ = Department.objects.get_or_create(
        name="Theatre / Surgical Services",
        defaults={"consultation_fee": 0, "description": "Auto-created department for theatre billing."},
    )
    visit = Visit.objects.create(
        patient=surgery.booking.patient, department=theatre_dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=surgery.booking.requested_by,
    )
    surgery.visit = visit
    surgery.save(update_fields=["visit"])
    return visit


def raise_theatre_invoice(surgery, description, amount):
    visit = ensure_theatre_visit(surgery)
    return Invoice.objects.create(
        patient=surgery.booking.patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,
        description=description, amount=amount,
    )


def compute_theatre_time_charge(surgery):
    hours = surgery.duration_hours
    return round(hours * float(surgery.theatre.hourly_rate), 2)