from api.models import Department, ConsultationType, VisitStatus, Visit, Patient, Gender, Invoice, InvoiceSourceType


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


def _billing_patient_for(mortuary_case):
    """
    Invoice.patient is a required, non-nullable FK, so unidentified /
    brought-in-dead cases (mortuary_case.patient is None) can't be invoiced
    directly. For those, we get-or-create a placeholder Patient scoped to
    this case's case_number, so all charges for the same unidentified case
    land on the same billing record instead of erroring out or scattering
    across multiple ad-hoc patients.
    """
    if mortuary_case.patient:
        return mortuary_case.patient

    placeholder_hospital_number = f"MRT-UNIDENT-{mortuary_case.case_number}"
    patient, _ = Patient.objects.get_or_create(
        hospital_number=placeholder_hospital_number,
        defaults={
            "full_name": mortuary_case.deceased_name_freetext or f"Unidentified ({mortuary_case.case_number})",
            "gender": mortuary_case.gender if mortuary_case.gender in Gender.values else Gender.OTHER,
        },
    )
    return patient


def raise_mortuary_invoice(mortuary_case, description, amount, user=None):
    """
    Invoices against the deceased's shared Visit if they're a registered
    Patient; unidentified/BID cases bill against a placeholder Patient
    record instead (see _billing_patient_for), since Invoice.patient does
    not allow null.
    """
    from .models import MortuaryCharge

    billing_patient = _billing_patient_for(mortuary_case)

    visit = None
    if mortuary_case.patient:
        # Reuse the case's existing mortuary Visit if one was already
        # created, rather than creating a new Visit per charge.
        visit = Visit.objects.filter(
            patient=mortuary_case.patient,
            department__name="Mortuary Services",
            status=VisitStatus.IN_CONSULTATION,
        ).order_by("-visit_date").first()
        if not visit:
            visit = ensure_mortuary_visit(mortuary_case.patient, registered_by=user)

    invoice = Invoice.objects.create(
        patient=billing_patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,  # closest existing category for a one-off billed service
        description=description, amount=amount,
    )
    MortuaryCharge.objects.create(mortuary_case=mortuary_case, invoice=invoice, description=description)
    return invoice


def charge_storage_to_date(mortuary_case, user=None):
    """
    Computes and invoices storage days not yet billed. Called on admission,
    on release, and on-demand (e.g. when viewing billing) for a long-staying
    case. Idempotent — only charges the delta since the last storage charge,
    tracked by summing days already billed rather than counting charge rows
    (a single charge can cover more than one day).
    """
    if not mortuary_case.compartment:
        return None

    storage_charges = mortuary_case.charges.filter(description__startswith="Storage -")
    already_charged_days = sum(_extract_days(c.description) for c in storage_charges)

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


def _extract_days(description):
    """Pulls the '(N day(s) @ ...)' count back out of a storage charge description."""
    import re
    match = re.search(r"\((\d+) day", description)
    return int(match.group(1)) if match else 1 