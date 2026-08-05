#icu/services.py
from datetime import date, timedelta

from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_icu_visit(icu_admission):
    """
    Guarantees this ICU admission has a Visit, creating one lazily if needed.
    Reused across every billing day for this stay — mirrors inpatient's
    ensure_admission_visit. Fixes the old behavior where every call to
    charge_icu_bed_day spawned a brand-new Visit.
    """
    if icu_admission.visit:
        return icu_admission.visit

    dept, _ = Department.objects.get_or_create(
        name="ICU / HDU",
        defaults={"consultation_fee": 0, "description": "Auto-created department for ICU/HDU billing."},
    )
    visit = Visit.objects.create(
        patient=icu_admission.patient,
        department=dept,
        doctor=icu_admission.attending_physician,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION,
        registered_by=icu_admission.admitted_by,
    )
    icu_admission.visit = visit
    icu_admission.save(update_fields=["visit"])
    return visit


def raise_icu_invoice(icu_admission, description, amount):
    visit = ensure_icu_visit(icu_admission)
    return Invoice.objects.create(
        patient=icu_admission.patient, visit=visit,
        source_type=InvoiceSourceType.INPATIENT,
        description=description, amount=amount,
    )


def charge_icu_bed_day(icu_admission, charge_date=None):
    """Idempotent — one charge per calendar day, same pattern as inpatient's generate_daily_bed_charges."""
    from .models import ICUBedCharge

    charge_date = charge_date or date.today()
    if ICUBedCharge.objects.filter(icu_admission=icu_admission, charge_date=charge_date).exists():
        return None

    amount = icu_admission.bed.daily_rate
    invoice = raise_icu_invoice(
        icu_admission,
        f"ICU/HDU Bed Charge - {icu_admission.bed.bed_number} ({charge_date})",
        amount,
    )
    return ICUBedCharge.objects.create(
        icu_admission=icu_admission, bed=icu_admission.bed,
        charge_date=charge_date, amount=amount, invoice=invoice,
    )


def backfill_icu_bed_charges(icu_admission, up_to_date=None):
    """
    Creates every missing daily bed charge between this admission's start
    and up_to_date (inclusive). This is what catches an ICU stay up on
    restart, or after the scheduler was down/unregistered for N days —
    instead of only ever charging "today" and silently losing the gap.
    """
    up_to_date = up_to_date or date.today()
    start = icu_admission.admitted_at.date()

    created = []
    day = start
    while day <= up_to_date:
        charge = charge_icu_bed_day(icu_admission, charge_date=day)
        if charge:
            created.append(str(charge.id))
        day += timedelta(days=1)
    return created


def generate_daily_icu_bed_charges():
    """Called by the scheduled job — charges/backfills every active ICU stay."""
    from .models import ICUAdmission, ICUAdmissionStatus

    created = []
    for admission in ICUAdmission.objects.filter(status=ICUAdmissionStatus.ADMITTED).select_related("bed", "patient"):
        created.extend(backfill_icu_bed_charges(admission))
    return created