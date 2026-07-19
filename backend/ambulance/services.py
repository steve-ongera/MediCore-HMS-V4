from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_ambulance_visit(patient, registered_by=None):
    """
    Shared-visit helper, matching the pattern used across inpatient/mch/
    emergency/insurance — so an ambulance charge for a registered patient
    lands on the same billing thread as everything else for that patient.
    """
    ambulance_dept, _ = Department.objects.get_or_create(
        name="Ambulance Services",
        defaults={"consultation_fee": 0, "description": "Auto-created department for ambulance dispatch billing."},
    )
    return Visit.objects.create(
        patient=patient, department=ambulance_dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def compute_dispatch_fee(dispatch):
    if not dispatch.ambulance:
        return 0
    base = dispatch.ambulance.base_fee
    distance_charge = (dispatch.distance_km or 0) * dispatch.ambulance.rate_per_km
    return base + distance_charge


def raise_dispatch_invoice(dispatch, user=None):
    """
    Invoices the dispatch fee. If the dispatch has a registered patient,
    reuses (or creates) their shared Visit so it appears in that patient's
    overall bill; if the patient is unregistered (walk-in emergency
    pickup with no Patient record), the invoice is created with visit=None
    — same fallback pattern as other unregistered-payer flows in this system.
    """
    amount = compute_dispatch_fee(dispatch)
    if amount <= 0:
        return None

    visit = None
    if dispatch.patient:
        visit = ensure_ambulance_visit(dispatch.patient, registered_by=user)

    invoice = Invoice.objects.create(
        patient=dispatch.patient, visit=visit,
        source_type=InvoiceSourceType.EMERGENCY,  # closest existing category; ambulance rides are billed as ED activity
        description=f"Ambulance Dispatch - {dispatch.dispatch_number} ({dispatch.dispatch_type})",
        amount=amount,
    )
    dispatch.invoice = invoice
    dispatch.save(update_fields=["invoice"])
    return invoice