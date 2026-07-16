from datetime import timedelta

from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType


def ensure_mch_visit(mother, doctor=None, registered_by=None):
    """Creates (or reuses) a shared MCH Visit for this mother, so every ANC/delivery/PNC/immunization invoice lands on the same Visit — same pattern as inpatient's ensure_admission_visit."""
    mch_dept, _ = Department.objects.get_or_create(
        name="Maternal & Child Health",
        defaults={
            "consultation_fee": 0,
            "description": "Auto-created department for MCH services (ANC, delivery, PNC, immunization).",
        },
    )
    return Visit.objects.create(
        patient=mother,
        department=mch_dept,
        doctor=doctor,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION,
        registered_by=registered_by,
    )


def raise_mch_invoice(patient, visit, description, amount):
    return Invoice.objects.create(
        patient=patient,
        visit=visit,
        source_type=InvoiceSourceType.MCH,
        description=description,
        amount=amount,
    )


def schedule_immunizations_for_child(child):
    """Creates a DUE ChildImmunization row for every active vaccine, with due_date computed from date_of_birth + recommended_age_weeks."""
    from .models import VaccineCatalog, ChildImmunization, ImmunizationStatus

    for vaccine in VaccineCatalog.objects.filter(is_active=True):
        if ChildImmunization.objects.filter(child=child, vaccine=vaccine).exists():
            continue
        due_date = child.date_of_birth + timedelta(weeks=vaccine.recommended_age_weeks)
        ChildImmunization.objects.create(child=child, vaccine=vaccine, due_date=due_date, status=ImmunizationStatus.DUE)