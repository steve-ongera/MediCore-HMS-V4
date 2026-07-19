from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_mortuary_visit(patient, registered_by=None):
    mortuary_dept, _ = Department.objects.get_or_create(
        name="Mortuary Services",
        defaults={"consultation_fee": 0, "description": "Auto-created department for mortuary storage and service billing."},
    )
    return Visit.objects.create(
        patient=patient, department=mortuary_dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_mortuary_invoice(mortuary_case, description, amount, user=None):
    """
    Invoices against the deceased's shared Visit if they're a registered
    Patient; otherwise creates a standalone invoice with patient=None,
    matching the same unregistered-payer fallback used in ambulance billing.
    """
    from .models import MortuaryCharge

    visit = None
    if mortuary_case.patient:
        visit = ensure_mortuary_visit(mortuary_case.patient, registered_by=user)

    invoice = Invoice.objects.create(
        patient=mortuary_case.patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,  # closest existing category for a one-off billed service
        description=description, amount=amount,
    )
    MortuaryCharge.objects.create(mortuary_case=mortuary_case, invoice=invoice, description=description)
    return invoice


def charge_storage_to_date(mortuary_case, user=None):
    """
    Computes and invoices storage days not yet billed. Called on release (or
    on-demand for a long-staying case). Idempotent — only charges the delta
    since the last storage MortuaryCharge, same pattern as
    emergency.services.charge_bay_time.
    """
    if not mortuary_case.compartment:
        return None

    already_charged_days = mortuary_case.charges.filter(description__startswith="Storage -").count()
    total_days = mortuary_case.days_in_storage
    new_days = total_days - already_charged_days

    if new_days <= 0:
        return None

    amount = new_days * mortuary_case.compartment.daily_storage_rate
    return raise_mortuary_invoice(
        mortuary_case,
        f"Storage - {mortuary_case.compartment.compartment_number} ({new_days} day(s) @ KES {mortuary_case.compartment.daily_storage_rate}/day)",
        amount, user=user,
    )