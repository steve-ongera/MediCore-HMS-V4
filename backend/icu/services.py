from datetime import date

from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_icu_visit(patient, registered_by=None):
    dept, _ = Department.objects.get_or_create(
        name="ICU / HDU",
        defaults={"consultation_fee": 0, "description": "Auto-created department for ICU/HDU billing."},
    )
    return Visit.objects.create(
        patient=patient, department=dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_icu_invoice(patient, description, amount, user=None):
    visit = ensure_icu_visit(patient, registered_by=user)
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.INPATIENT,
        description=description, amount=amount,
    )


def charge_icu_bed_day(icu_admission, user=None):
    """Idempotent — one charge per calendar day, same pattern as inpatient's generate_daily_bed_charges."""
    from .models import ICUBedCharge

    today = date.today()
    if ICUBedCharge.objects.filter(icu_admission=icu_admission, charge_date=today).exists():
        return None

    amount = icu_admission.bed.daily_rate
    invoice = raise_icu_invoice(
        icu_admission.patient,
        f"ICU/HDU Bed Charge - {icu_admission.bed.bed_number} ({today})",
        amount, user=user,
    )
    return ICUBedCharge.objects.create(
        icu_admission=icu_admission, bed=icu_admission.bed,
        charge_date=today, amount=amount, invoice=invoice,
    )


def generate_daily_icu_bed_charges():
    """Called by a scheduled job (same pattern as inpatient's scheduler) to charge all active ICU stays daily."""
    from .models import ICUAdmission, ICUAdmissionStatus

    created = []
    for admission in ICUAdmission.objects.filter(status=ICUAdmissionStatus.ADMITTED).select_related("bed", "patient"):
        charge = charge_icu_bed_day(admission)
        if charge:
            created.append(str(charge.id))
    return created