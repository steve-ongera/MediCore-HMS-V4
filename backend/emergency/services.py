#emergency/services.py
from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType

# Emergency Registration fee varies from Hospitals to Hospitals 300-1000

REGISTRATION_FEE = 1000

def generate_pending_bay_charges():
    """
    Tops up bay-time charges for every ED encounter still in progress.
    Without this, a long-staying ED patient accrues zero invoices until
    someone dispositions them or opens their billing tab — this is what
    makes bay-time billing continuous instead of relying on a person to
    trigger it. Hourly cadence matches ED's unit of billing (hours, not
    days like inpatient/ICU).
    """
    from .models import EmergencyVisit, EmergencyStatus

    created = []
    active_visits = (
        EmergencyVisit.objects.filter(status=EmergencyStatus.IN_ED, bay__isnull=False)
        .select_related("bay", "patient", "visit")
    )

    for ed_visit in active_visits:
        if not ed_visit.visit:
            continue  # no Visit yet — nothing to attach an invoice to; billing tab/disposition will backfill this
        charge = charge_bay_time(ed_visit)
        if charge:
            created.append(str(charge.id))
    return created

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