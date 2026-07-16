from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType

REGISTRATION_FEE = 1000


def ensure_emergency_visit(patient, doctor=None, registered_by=None):
    ed_dept, _ = Department.objects.get_or_create(
        name="Emergency Department",
        defaults={
            "consultation_fee": 0,
            "description": "Auto-created department for Emergency Department encounters.",
        },
    )
    return Visit.objects.create(
        patient=patient,
        department=ed_dept,
        doctor=doctor,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION,
        registered_by=registered_by,
    )


def raise_emergency_invoice(patient, visit, description, amount):
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.EMERGENCY,
        description=description, amount=amount,
    )


def charge_bay_time(emergency_visit, user=None):
    """
    Computes and invoices the ED bay time up to now (or disposition time if
    already set). Called once at disposition. Idempotent-ish: if called
    again for the same visit before disposition changes, it charges only
    the additional hours since the last EmergencyBayCharge, so re-running
    it (e.g. a long-staying patient billed mid-stay) never double-charges.
    """
    if not emergency_visit.bay:
        return None

    from .models import EmergencyBayCharge

    already_charged_hours = sum(
        (c.hours_charged for c in emergency_visit.bay_charges.all()), start=0
    )
    total_hours = round(emergency_visit.duration_hours, 2)
    new_hours = round(total_hours - float(already_charged_hours), 2)

    if new_hours <= 0:
        return None

    amount = round(new_hours * float(emergency_visit.bay.hourly_rate), 2)
    if amount <= 0:
        return None

    visit = emergency_visit.visit
    invoice = raise_emergency_invoice(
        emergency_visit.patient, visit,
        f"ED Bay Time - {emergency_visit.bay.bay_number} ({new_hours}h @ KES {emergency_visit.bay.hourly_rate}/hr)",
        amount,
    )
    return EmergencyBayCharge.objects.create(
        emergency_visit=emergency_visit, bay=emergency_visit.bay,
        hours_charged=new_hours, amount=amount, invoice=invoice,
    )