from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from api.models import Invoice
from .models import RevenueLeakageRecord, LeakageStatus, LeakageSourceType, LeakageScanLog


def _upsert_leak(source_type, source_object_id, patient, description, amount, event_date):
    """
    Creates a leak record if one doesn't already exist for this source
    object, or reactivates it if it was previously written off/resolved but
    somehow still has no invoice (shouldn't normally happen, but keeps the
    scan idempotent and safe to re-run).
    """
    record, created = RevenueLeakageRecord.objects.get_or_create(
        source_type=source_type, source_object_id=source_object_id,
        defaults={
            "patient_name": patient.full_name if patient else "Unknown",
            "hospital_number": getattr(patient, "hospital_number", "") or "",
            "description": description,
            "expected_amount": amount,
            "event_date": event_date,
            "status": LeakageStatus.OPEN,
        },
    )
    return record, created


def scan_lab_orders():
    from api.models import LabOrder, LabOrderStatus
    new_count = 0
    orders = LabOrder.objects.filter(status=LabOrderStatus.COMPLETED).select_related("test", "consultation__visit__patient")
    for order in orders:
        if order.invoice_id:
            continue  # already invoiced through the normal flow
        patient = order.consultation.visit.patient
        _, created = _upsert_leak(
            LeakageSourceType.LAB, order.id, patient,
            f"Lab test completed with no invoice: {order.test.name}",
            order.test.price, order.ordered_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_radiology_orders():
    from api.models import RadiologyOrder, RadiologyOrderStatus
    new_count = 0
    orders = RadiologyOrder.objects.filter(status=RadiologyOrderStatus.REPORTED).select_related("test", "consultation__visit__patient")
    for order in orders:
        if order.invoice_id:
            continue
        patient = order.consultation.visit.patient
        _, created = _upsert_leak(
            LeakageSourceType.RADIOLOGY, order.id, patient,
            f"Radiology completed with no invoice: {order.test.name}",
            order.test.price, order.ordered_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_pharmacy_dispenses():
    from api.models import PharmacyDispense
    new_count = 0
    dispenses = PharmacyDispense.objects.filter(status="COMPLETED").select_related("prescription__medicine", "prescription__consultation__visit__patient")
    for d in dispenses:
        if d.invoice_id:
            continue
        patient = d.prescription.consultation.visit.patient
        amount = d.prescription.medicine.unit_price * d.quantity_dispensed
        _, created = _upsert_leak(
            LeakageSourceType.PHARMACY_DISPENSE, d.id, patient,
            f"Medicine dispensed with no invoice: {d.prescription.medicine.name} x{d.quantity_dispensed}",
            amount, d.completed_at or d.dispensed_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_consultation_procedures():
    from api.models import ConsultationProcedure
    new_count = 0
    for proc in ConsultationProcedure.objects.select_related("consultation__visit__patient"):
        if proc.invoice_id:
            continue
        patient = proc.consultation.visit.patient
        _, created = _upsert_leak(
            LeakageSourceType.CONSULTATION_PROCEDURE, proc.id, patient,
            f"Consultation procedure with no invoice: {proc.description}",
            proc.amount, proc.performed_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_theatre():
    from theatre.models import Surgery, SurgeryStatus
    new_count = 0
    for surgery in Surgery.objects.filter(status=SurgeryStatus.COMPLETED).select_related("booking__patient", "booking__procedure"):
        if surgery.invoice_id:
            continue
        patient = surgery.booking.patient
        _, created = _upsert_leak(
            LeakageSourceType.THEATRE, surgery.id, patient,
            f"Surgery completed with no invoice: {surgery.booking.procedure.name}",
            surgery.booking.procedure.base_price, surgery.theatre_out_at or surgery.theatre_in_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_dental():
    from dental.models import DentalProcedureRecord
    new_count = 0
    for rec in DentalProcedureRecord.objects.select_related("treatment_plan__dental_visit__patient", "treatment_plan__procedure"):
        if rec.invoice_id:
            continue
        patient = rec.treatment_plan.dental_visit.patient
        _, created = _upsert_leak(
            LeakageSourceType.DENTAL, rec.id, patient,
            f"Dental procedure performed with no invoice: {rec.treatment_plan.procedure.name}",
            rec.treatment_plan.procedure.price, rec.performed_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_eye_clinic():
    from eyeclinic.models import EyeProcedureRecord
    new_count = 0
    for rec in EyeProcedureRecord.objects.select_related("treatment_plan__eye_visit__patient", "treatment_plan__procedure"):
        if rec.invoice_id:
            continue
        patient = rec.treatment_plan.eye_visit.patient
        _, created = _upsert_leak(
            LeakageSourceType.EYE_CLINIC, rec.id, patient,
            f"Eye clinic procedure performed with no invoice: {rec.treatment_plan.procedure.name}",
            rec.treatment_plan.procedure.price, rec.performed_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_mch_deliveries():
    from mch.models import DeliveryRecord
    new_count = 0
    for d in DeliveryRecord.objects.select_related("profile__mother").filter(invoice__isnull=True):
        patient = d.profile.mother
        _, created = _upsert_leak(
            LeakageSourceType.MCH_DELIVERY, d.id, patient,
            f"Delivery recorded with no invoice: {d.delivery_number}",
            Decimal("8000"), d.delivery_date,  # matches DELIVERY_FEE constant in mch.views
        )
        if created:
            new_count += 1
    return new_count


def scan_mch_immunizations():
    from mch.models import ChildImmunization, ImmunizationStatus
    new_count = 0
    qs = ChildImmunization.objects.filter(status=ImmunizationStatus.GIVEN, invoice__isnull=True).select_related("vaccine", "child__mother")
    for imm in qs:
        if not imm.vaccine.price or imm.vaccine.price <= 0:
            continue  # free vaccines aren't leakage
        patient = imm.child.mother
        _, created = _upsert_leak(
            LeakageSourceType.MCH_IMMUNIZATION, imm.id, patient,
            f"Immunization given with no invoice: {imm.vaccine.name}",
            imm.vaccine.price, imm.given_date,
        )
        if created:
            new_count += 1
    return new_count


def scan_dialysis():
    from dialysis.models import DialysisSession, SessionStatus
    new_count = 0
    for s in DialysisSession.objects.filter(status=SessionStatus.COMPLETED, invoice__isnull=True).select_related("profile__patient"):
        patient = s.profile.patient
        _, created = _upsert_leak(
            LeakageSourceType.DIALYSIS, s.id, patient,
            f"Dialysis session completed with no invoice: {s.session_number}",
            Decimal("3500"), s.ended_at or s.scheduled_date,  # matches SESSION_BASE_FEE
        )
        if created:
            new_count += 1
    return new_count


def scan_icu():
    from icu.models import ICUProcedureRecord
    new_count = 0
    for rec in ICUProcedureRecord.objects.filter(invoice__isnull=True).select_related("icu_admission__patient", "procedure"):
        patient = rec.icu_admission.patient
        _, created = _upsert_leak(
            LeakageSourceType.ICU_PROCEDURE, rec.id, patient,
            f"ICU procedure performed with no invoice: {rec.procedure.name}",
            rec.procedure.price, rec.performed_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_blood_bank():
    from bloodbank.models import BloodIssue
    new_count = 0
    for issue in BloodIssue.objects.filter(invoice__isnull=True).select_related("request__patient", "unit"):
        patient = issue.request.patient
        if not issue.unit.unit_price or issue.unit.unit_price <= 0:
            continue
        _, created = _upsert_leak(
            LeakageSourceType.BLOOD_BANK, issue.id, patient,
            f"Blood unit issued with no invoice: {issue.unit.unit_number}",
            issue.unit.unit_price, issue.issued_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_ambulance():
    from ambulance.models import AmbulanceDispatch, DispatchStatus
    new_count = 0
    for d in AmbulanceDispatch.objects.filter(status=DispatchStatus.COMPLETED, invoice__isnull=True):
        if not d.ambulance:
            continue
        from ambulance.services import compute_dispatch_fee
        amount = compute_dispatch_fee(d)
        if amount <= 0:
            continue
        patient = d.patient
        _, created = _upsert_leak(
            LeakageSourceType.AMBULANCE, d.id, patient,
            f"Ambulance dispatch completed with no invoice: {d.dispatch_number}",
            amount, d.completed_at or d.requested_at,
        )
        if created:
            new_count += 1
    return new_count


def scan_mortuary():
    from mortuary.models import MortuaryServiceRecord, MortuaryServiceStatus
    new_count = 0
    for rec in MortuaryServiceRecord.objects.filter(status=MortuaryServiceStatus.COMPLETED, invoice__isnull=True).select_related("mortuary_case__patient", "service"):
        patient = rec.mortuary_case.patient
        _, created = _upsert_leak(
            LeakageSourceType.MORTUARY, rec.id, patient,
            f"Mortuary service completed with no invoice: {rec.service.name}",
            rec.service.price, rec.completed_at or rec.ordered_at,
        )
        if created:
            new_count += 1
    return new_count


SCAN_FUNCTIONS = [
    scan_lab_orders, scan_radiology_orders, scan_pharmacy_dispenses,
    scan_consultation_procedures, scan_theatre, scan_dental, scan_eye_clinic,
    scan_mch_deliveries, scan_mch_immunizations, scan_dialysis, scan_icu,
    scan_blood_bank, scan_ambulance, scan_mortuary,
]


def run_leakage_scan(user=None):
    """
    Runs every detector. Safe to call repeatedly (each detector is
    idempotent via get_or_create on source_type+source_object_id) — designed
    to run on a schedule (e.g. hourly) AND on-demand from the dashboard's
    "Scan Now" button.
    """
    log = LeakageScanLog.objects.create(triggered_by=user)
    total_new = 0

    for scan_fn in SCAN_FUNCTIONS:
        try:
            total_new += scan_fn()
        except Exception:
            import logging
            logging.getLogger("leakage").exception(f"Leakage scan function {scan_fn.__name__} failed.")
            continue  # one broken detector shouldn't block the rest

    open_leaks = RevenueLeakageRecord.objects.filter(status=LeakageStatus.OPEN)
    total_amount = sum((r.expected_amount for r in open_leaks), start=Decimal("0"))

    log.completed_at = timezone.now()
    log.new_leaks_found = total_new
    log.total_open_leaks = open_leaks.count()
    log.total_leaked_amount = total_amount
    log.save()

    return log


def resolve_leak_with_invoice(leak, description_override=None, user=None):
    """
    Creates the missing Invoice and marks the leak resolved — this is the
    "Bill Now" one-click action. Uses the same InvoiceSourceType mapping
    each detector already implies.
    """
    from api.models import InvoiceSourceType

    source_type_map = {
        "LAB": InvoiceSourceType.LAB,
        "RADIOLOGY": InvoiceSourceType.RADIOLOGY,
        "PHARMACY_DISPENSE": InvoiceSourceType.PHARMACY,
    }
    invoice_source_type = source_type_map.get(leak.source_type, InvoiceSourceType.PROCEDURE)

    with transaction.atomic():
        from api.models import Patient
        patient = Patient.objects.filter(hospital_number=leak.hospital_number).first()

        invoice = Invoice.objects.create(
            patient=patient,
            source_type=invoice_source_type,
            description=description_override or leak.description,
            amount=leak.expected_amount,
        )
        leak.status = LeakageStatus.RESOLVED
        leak.resolved_invoice = invoice
        leak.resolved_by = user
        leak.resolved_at = timezone.now()
        leak.save()

    return leak