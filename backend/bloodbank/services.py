from datetime import timedelta

from api.models import Department, ConsultationType, VisitStatus, Visit, Invoice, InvoiceSourceType

from .models import COMPATIBILITY_MAP, ComponentType


# Component-specific shelf life, days from collection.
SHELF_LIFE_DAYS = {
    ComponentType.WHOLE_BLOOD: 35,
    ComponentType.PACKED_RED_CELLS: 42,
    ComponentType.PLATELETS: 5,
    ComponentType.FRESH_FROZEN_PLASMA: 365,
    ComponentType.CRYOPRECIPITATE: 365,
}


def compute_expiry_date(collection_date, component_type):
    return collection_date + timedelta(days=SHELF_LIFE_DAYS.get(component_type, 35))


def is_compatible(recipient_group, donor_group):
    return donor_group in COMPATIBILITY_MAP.get(recipient_group, [])


def ensure_bloodbank_visit(patient, registered_by=None):
    dept, _ = Department.objects.get_or_create(
        name="Blood Bank",
        defaults={"consultation_fee": 0, "description": "Auto-created department for blood bank billing."},
    )
    return Visit.objects.create(
        patient=patient, department=dept,
        consultation_type=ConsultationType.OTHER,
        status=VisitStatus.IN_CONSULTATION, registered_by=registered_by,
    )


def raise_bloodbank_invoice(patient, description, amount, user=None):
    visit = ensure_bloodbank_visit(patient, registered_by=user)
    return Invoice.objects.create(
        patient=patient, visit=visit,
        source_type=InvoiceSourceType.PROCEDURE,
        description=description, amount=amount,
    )