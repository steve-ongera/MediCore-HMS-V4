from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType

SESSION_BASE_FEE = 3500  # flat treatment fee, separate from machine time


def ensure_dialysis_visit(patient, registered_by=None):
    dept, _ = Department.objects.get_or_create(
        name="Dialysis Unit",
        defaults={"consultation_fee": 0, "description": "Auto-created department for dialysis billing."},
    )
    return Visit.objects.create(
        patient=patient, department=dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_dialysis_invoice(patient, description, amount, user=None):
    visit = ensure_dialysis_visit(patient, registered_by=user)
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,
        description=description, amount=amount,
    )


def compute_session_charge(session):
    machine_fee = session.machine.rate_per_session if session.machine else 0
    return SESSION_BASE_FEE + float(machine_fee)