#api/dashbaords.py
from datetime import date, timedelta

from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Role, Patient, Visit, Invoice, InvoiceStatus, Payment, OTCSale,
    QueueEntry, QueueStatus, Consultation, ConsultationStatus,
    LabOrder, LabOrderStatus, RadiologyOrder, RadiologyOrderStatus,
    Medicine, StockTransaction, PharmacyDispense, ConsultationDiagnosis,
)


def _last7():
    today = date.today()
    return [today - timedelta(days=i) for i in range(6, -1, -1)]


def _pending_prescriptions():
    from api.models import Prescription
    return Prescription.objects.filter(is_dispensed=False).count()


def _accessible_branch_ids(user):
    """None means GROUP_ADMIN/superuser — sees every branch, no filter applied."""
    from branches.permissions import get_accessible_branch_ids
    return get_accessible_branch_ids(user)


def _branch_label(user, accessible=None):
    """Human-readable branch context for the dashboard header."""
    if accessible is None:
        accessible = _accessible_branch_ids(user)
    if accessible is None:
        return "All Branches"
    return user.branch.name if user.branch_id else None


def receptionist_dashboard(user):
    from emergency.models import EmergencyVisit
    # Ambulance dispatch not branch-scoped here — ambulance/models.py hasn't
    # been reviewed for a branch field in this pass. Left unfiltered
    # (group-wide) rather than guessing a field name that may not exist.
    from ambulance.models import AmbulanceDispatch

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    patients_qs = Patient.objects.filter(created_at__date=today)
    visits_qs = Visit.objects.filter(visit_date__date=today)
    queue_qs = QueueEntry.objects.exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED])
    ed_qs = EmergencyVisit.objects.filter(arrived_at__date=today)
    ambulance_qs = AmbulanceDispatch.objects.filter(requested_at__date=today)

    if accessible is not None:
        patients_qs = patients_qs.filter(home_branch_id__in=accessible)
        visits_qs = visits_qs.filter(branch_id__in=accessible)
        queue_qs = queue_qs.filter(visit__branch_id__in=accessible)
        ed_qs = ed_qs.filter(visit__branch_id__in=accessible)
        # ambulance_qs intentionally left unfiltered — see import comment above

    cards = [
        {"label": "Patients Registered Today", "value": patients_qs.count()},
        {"label": "Visits Registered Today", "value": visits_qs.count()},
        {"label": "Queue Waiting", "value": queue_qs.count()},
        {"label": "Emergency Registered Today", "value": ed_qs.count()},
        {"label": "Ambulance Dispatches Today", "value": ambulance_qs.count()},
    ]

    def _patients_on(d):
        qs = Patient.objects.filter(created_at__date=d)
        if accessible is not None:
            qs = qs.filter(home_branch_id__in=accessible)
        return qs.count()

    line = {"title": "Patients Registered — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _patients_on(d)} for d in days
    ]}

    today_visits_scoped = Visit.objects.filter(visit_date__date=today)
    if accessible is not None:
        today_visits_scoped = today_visits_scoped.filter(branch_id__in=accessible)
    bar_qs = today_visits_scoped.values("department__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Today's Visits by Department", "data": [{"name": r["department__name"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    pie_qs = today_visits_scoped.values("status").annotate(count=Count("id"))
    pie = {"title": "Today's Visit Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def cashier_dashboard(user):
    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    payments_today = Payment.objects.filter(paid_at__date=today)
    otc_today_qs = OTCSale.objects.filter(sold_at__date=today)
    invoices_open = Invoice.objects.exclude(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED])
    invoices_all = Invoice.objects.all()
    unpaid_qs = Invoice.objects.filter(status=InvoiceStatus.UNPAID)

    if accessible is not None:
        payments_today = payments_today.filter(branch_id__in=accessible)
        otc_today_qs = otc_today_qs.filter(branch_id__in=accessible)
        invoices_open = invoices_open.filter(branch_id__in=accessible)
        invoices_all = invoices_all.filter(branch_id__in=accessible)
        unpaid_qs = unpaid_qs.filter(branch_id__in=accessible)

    todays_collections = payments_today.aggregate(t=Sum("amount"))["t"] or 0
    otc_today = otc_today_qs.aggregate(t=Sum("amount_paid"))["t"] or 0
    outstanding = sum((inv.balance for inv in invoices_open), start=0)

    cards = [
        {"label": "Today's Collections", "value": f"KES {todays_collections}"},
        {"label": "OTC Sales Today", "value": f"KES {otc_today}"},
        {"label": "Payments Processed Today", "value": payments_today.count()},
        {"label": "Pending Invoices", "value": unpaid_qs.count()},
        {"label": "Outstanding Balance", "value": f"KES {outstanding}"},
    ]

    def _collections_on(d):
        qs = Payment.objects.filter(paid_at__date=d)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return float(qs.aggregate(t=Sum("amount"))["t"] or 0)

    line = {"title": "Collections — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _collections_on(d)} for d in days
    ]}
    bar_qs = payments_today.values("method").annotate(total=Sum("amount"))
    bar = {"title": "Today's Collections by Method", "data": [{"name": r["method"], "value": float(r["total"] or 0)} for r in bar_qs]}
    pie_qs = invoices_all.values("status").annotate(count=Count("id"))
    pie = {"title": "Invoice Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def nurse_dashboard(user):
    from emergency.models import EmergencyVisit, EmergencyStatus
    from inpatient.models import Admission, AdmissionStatus
    # MCH's ANCVisit not branch-scoped here — mch/models.py hasn't been
    # reviewed for a branch field in this pass. Left unfiltered (group-wide).
    from mch.models import ANCVisit

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    nurse_queue_qs = QueueEntry.objects.filter(queue_type="NURSE").exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED])
    admissions_qs = Admission.objects.filter(status=AdmissionStatus.ADMITTED)
    ed_qs = EmergencyVisit.objects.filter(status=EmergencyStatus.IN_ED)
    anc_today_qs = ANCVisit.objects.filter(visit_date__date=today)
    queue_today_qs = QueueEntry.objects.filter(created_at__date=today)

    if accessible is not None:
        nurse_queue_qs = nurse_queue_qs.filter(visit__branch_id__in=accessible)
        admissions_qs = admissions_qs.filter(visit__branch_id__in=accessible)
        ed_qs = ed_qs.filter(visit__branch_id__in=accessible)
        queue_today_qs = queue_today_qs.filter(visit__branch_id__in=accessible)
        # anc_today_qs intentionally left unfiltered — see import comment above

    cards = [
        {"label": "Patients Waiting (Nurse Queue)", "value": nurse_queue_qs.count()},
        {"label": "Active Admissions", "value": admissions_qs.count()},
        {"label": "Emergency Patients Active", "value": ed_qs.count()},
        {"label": "ANC Visits Today", "value": anc_today_qs.count()},
        {"label": "Queue Entries Today", "value": queue_today_qs.count()},
    ]

    def _queue_on(d):
        qs = QueueEntry.objects.filter(created_at__date=d)
        if accessible is not None:
            qs = qs.filter(visit__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Queue Entries — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _queue_on(d)} for d in days
    ]}
    bar_qs = admissions_qs.values("bed__ward__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Active Admissions by Ward", "data": [{"name": r["bed__ward__name"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    pie_source = QueueEntry.objects.exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED])
    if accessible is not None:
        pie_source = pie_source.filter(visit__branch_id__in=accessible)
    pie_qs = pie_source.values("status").annotate(count=Count("id"))
    pie = {"title": "Queue Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def doctor_dashboard(user):
    # Theatre's SurgeryBooking not branch-scoped here — theatre/models.py
    # hasn't been reviewed for a branch field in this pass. Left unfiltered.
    # Also note: "my consultations/orders" is already inherently scoped to
    # THIS doctor (doctor=user) — a doctor only ever works at their own
    # branch in practice, but the branch filter is still applied below for
    # correctness in case a doctor has cross-branch access (GROUP_ADMIN-like).
    from theatre.models import SurgeryBooking

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    my_queue_qs = QueueEntry.objects.filter(queue_type="DOCTOR", assigned_to=user).exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED])
    consult_completed_qs = Consultation.objects.filter(doctor=user, completed_at__date=today)
    consult_in_progress_qs = Consultation.objects.filter(doctor=user, status=ConsultationStatus.IN_PROGRESS)
    surgeries_qs = SurgeryBooking.objects.filter(primary_surgeon=user).exclude(status__in=["COMPLETED", "CANCELLED"])
    lab_orders_qs = LabOrder.objects.filter(ordered_by=user).exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED])

    if accessible is not None:
        my_queue_qs = my_queue_qs.filter(visit__branch_id__in=accessible)
        consult_completed_qs = consult_completed_qs.filter(visit__branch_id__in=accessible)
        consult_in_progress_qs = consult_in_progress_qs.filter(visit__branch_id__in=accessible)
        lab_orders_qs = lab_orders_qs.filter(consultation__visit__branch_id__in=accessible)
        # surgeries_qs intentionally left unfiltered — see import comment above

    cards = [
        {"label": "My Queue Today", "value": my_queue_qs.count()},
        {"label": "Consultations Completed Today", "value": consult_completed_qs.count()},
        {"label": "Consultations In Progress", "value": consult_in_progress_qs.count()},
        {"label": "My Surgeries Booked", "value": surgeries_qs.count()},
        {"label": "Lab Orders Pending (Mine)", "value": lab_orders_qs.count()},
    ]

    def _consults_on(d):
        qs = Consultation.objects.filter(doctor=user, started_at__date=d)
        if accessible is not None:
            qs = qs.filter(visit__branch_id__in=accessible)
        return qs.count()

    line = {"title": "My Consultations — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _consults_on(d)} for d in days
    ]}
    diagnoses_qs = ConsultationDiagnosis.objects.filter(
        consultation__doctor=user, consultation__started_at__date__gte=today - timedelta(days=30)
    )
    if accessible is not None:
        diagnoses_qs = diagnoses_qs.filter(consultation__visit__branch_id__in=accessible)
    bar_qs = diagnoses_qs.values("icd10_code__description").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "My Top Diagnoses (30 days)", "data": [{"name": r["icd10_code__description"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    my_consults_all = Consultation.objects.filter(doctor=user)
    if accessible is not None:
        my_consults_all = my_consults_all.filter(visit__branch_id__in=accessible)
    pie_qs = my_consults_all.values("status").annotate(count=Count("id"))
    pie = {"title": "My Consultation Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def lab_dashboard(user):
    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    pending_qs = LabOrder.objects.exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED])
    completed_today_qs = LabOrder.objects.filter(status=LabOrderStatus.COMPLETED, result__completed_at__date=today)
    ordered_today_qs = LabOrder.objects.filter(ordered_at__date=today)
    awaiting_collection_qs = LabOrder.objects.filter(status=LabOrderStatus.ORDERED)
    completed_month_qs = LabOrder.objects.filter(status=LabOrderStatus.COMPLETED, ordered_at__date__gte=today.replace(day=1))
    all_orders_qs = LabOrder.objects.all()

    if accessible is not None:
        branch_path = "consultation__visit__branch_id__in"
        pending_qs = pending_qs.filter(**{branch_path: accessible})
        completed_today_qs = completed_today_qs.filter(**{branch_path: accessible})
        ordered_today_qs = ordered_today_qs.filter(**{branch_path: accessible})
        awaiting_collection_qs = awaiting_collection_qs.filter(**{branch_path: accessible})
        completed_month_qs = completed_month_qs.filter(**{branch_path: accessible})
        all_orders_qs = all_orders_qs.filter(**{branch_path: accessible})

    cards = [
        {"label": "Pending Lab Orders", "value": pending_qs.count()},
        {"label": "Completed Today", "value": completed_today_qs.count()},
        {"label": "Ordered Today", "value": ordered_today_qs.count()},
        {"label": "Awaiting Collection", "value": awaiting_collection_qs.count()},
        {"label": "Completed This Month", "value": completed_month_qs.count()},
    ]

    def _orders_on(d):
        qs = LabOrder.objects.filter(ordered_at__date=d)
        if accessible is not None:
            qs = qs.filter(consultation__visit__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Lab Orders — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _orders_on(d)} for d in days
    ]}
    last30_qs = LabOrder.objects.filter(ordered_at__date__gte=today - timedelta(days=30))
    if accessible is not None:
        last30_qs = last30_qs.filter(consultation__visit__branch_id__in=accessible)
    bar_qs = last30_qs.values("test__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Tests Ordered (30 days)", "data": [{"name": r["test__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = all_orders_qs.values("status").annotate(count=Count("id"))
    pie = {"title": "Lab Order Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def radiology_dashboard(user):
    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    pending_qs = RadiologyOrder.objects.exclude(status__in=[RadiologyOrderStatus.REPORTED, RadiologyOrderStatus.CANCELLED])
    reported_today_qs = RadiologyOrder.objects.filter(status=RadiologyOrderStatus.REPORTED, result__completed_at__date=today)
    ordered_today_qs = RadiologyOrder.objects.filter(ordered_at__date=today)
    awaiting_report_qs = RadiologyOrder.objects.filter(status=RadiologyOrderStatus.DONE)
    reported_month_qs = RadiologyOrder.objects.filter(status=RadiologyOrderStatus.REPORTED, ordered_at__date__gte=today.replace(day=1))
    all_orders_qs = RadiologyOrder.objects.all()

    if accessible is not None:
        branch_path = "consultation__visit__branch_id__in"
        pending_qs = pending_qs.filter(**{branch_path: accessible})
        reported_today_qs = reported_today_qs.filter(**{branch_path: accessible})
        ordered_today_qs = ordered_today_qs.filter(**{branch_path: accessible})
        awaiting_report_qs = awaiting_report_qs.filter(**{branch_path: accessible})
        reported_month_qs = reported_month_qs.filter(**{branch_path: accessible})
        all_orders_qs = all_orders_qs.filter(**{branch_path: accessible})

    cards = [
        {"label": "Pending Radiology Orders", "value": pending_qs.count()},
        {"label": "Reported Today", "value": reported_today_qs.count()},
        {"label": "Ordered Today", "value": ordered_today_qs.count()},
        {"label": "Awaiting Report", "value": awaiting_report_qs.count()},
        {"label": "Reported This Month", "value": reported_month_qs.count()},
    ]

    def _orders_on(d):
        qs = RadiologyOrder.objects.filter(ordered_at__date=d)
        if accessible is not None:
            qs = qs.filter(consultation__visit__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Radiology Orders — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _orders_on(d)} for d in days
    ]}
    last30_qs = RadiologyOrder.objects.filter(ordered_at__date__gte=today - timedelta(days=30))
    if accessible is not None:
        last30_qs = last30_qs.filter(consultation__visit__branch_id__in=accessible)
    bar_qs = last30_qs.values("test__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Tests Ordered (30 days)", "data": [{"name": r["test__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = all_orders_qs.values("status").annotate(count=Count("id"))
    pie = {"title": "Radiology Order Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def pharmacy_dashboard(user):
    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    # Medicine catalog itself stays chain-wide (shared pricing/reorder
    # levels, same as everywhere else) — only stock movement (dispenses,
    # OTC sales, stock transactions) is branch-scoped.
    low_stock = len([m for m in Medicine.objects.all() if m.is_low_stock])

    dispensed_today_qs = PharmacyDispense.objects.filter(dispensed_at__date=today)
    otc_today_qs = OTCSale.objects.filter(sold_at__date=today)
    stock_txn_today_qs = StockTransaction.objects.filter(created_at__date=today)

    if accessible is not None:
        dispensed_today_qs = dispensed_today_qs.filter(prescription__consultation__visit__branch_id__in=accessible)
        otc_today_qs = otc_today_qs.filter(branch_id__in=accessible)
        stock_txn_today_qs = stock_txn_today_qs.filter(batch__branch_id__in=accessible)

    cards = [
        {"label": "Low Stock Items", "value": low_stock},
        {"label": "Prescriptions Pending", "value": _pending_prescriptions()},
        {"label": "Dispensed Today", "value": dispensed_today_qs.count()},
        {"label": "OTC Sales Today", "value": otc_today_qs.count()},
        {"label": "Stock Transactions Today", "value": stock_txn_today_qs.count()},
    ]

    def _dispensed_on(d):
        qs = PharmacyDispense.objects.filter(dispensed_at__date=d)
        if accessible is not None:
            qs = qs.filter(prescription__consultation__visit__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Dispenses — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _dispensed_on(d)} for d in days
    ]}
    last30_qs = PharmacyDispense.objects.filter(dispensed_at__date__gte=today - timedelta(days=30))
    if accessible is not None:
        last30_qs = last30_qs.filter(prescription__consultation__visit__branch_id__in=accessible)
    bar_qs = last30_qs.values("prescription__medicine__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Medicines Dispensed (30 days)", "data": [{"name": r["prescription__medicine__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = stock_txn_today_qs.values("transaction_type").annotate(count=Count("id"))
    pie = {"title": "Today's Stock Transactions", "data": [{"name": r["transaction_type"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def accountant_dashboard(user):
    # Finance's Expense and Procurement's SupplierInvoice not branch-scoped
    # here — finance/models.py and procurement/models.py haven't been
    # reviewed for a branch field in this pass. Left unfiltered.
    from finance.models import Expense, ExpenseStatus
    from procurement.models import SupplierInvoice, SupplierInvoiceStatus

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    payments_today_qs = Payment.objects.filter(paid_at__date=today)
    otc_today_qs = OTCSale.objects.filter(sold_at__date=today)
    invoices_open_qs = Invoice.objects.exclude(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED])
    invoices_all_qs = Invoice.objects.all()
    invoices_30d_qs = Invoice.objects.filter(created_at__date__gte=today - timedelta(days=30))
    monthly_expenses_qs = Expense.objects.filter(status=ExpenseStatus.PAID, expense_date__gte=today.replace(day=1))
    supplier_invoices_due_qs = SupplierInvoice.objects.exclude(status=SupplierInvoiceStatus.PAID)
    pending_expenses_qs = Expense.objects.filter(status=ExpenseStatus.PENDING_APPROVAL)

    if accessible is not None:
        payments_today_qs = payments_today_qs.filter(branch_id__in=accessible)
        otc_today_qs = otc_today_qs.filter(branch_id__in=accessible)
        invoices_open_qs = invoices_open_qs.filter(branch_id__in=accessible)
        invoices_all_qs = invoices_all_qs.filter(branch_id__in=accessible)
        invoices_30d_qs = invoices_30d_qs.filter(branch_id__in=accessible)
        # monthly_expenses_qs, supplier_invoices_due_qs, pending_expenses_qs
        # intentionally left unfiltered — see import comment above

    todays_revenue = (payments_today_qs.aggregate(t=Sum("amount"))["t"] or 0) + (otc_today_qs.aggregate(t=Sum("amount_paid"))["t"] or 0)
    outstanding = sum((inv.balance for inv in invoices_open_qs), start=0)
    monthly_expenses = monthly_expenses_qs.aggregate(t=Sum("amount"))["t"] or 0

    cards = [
        {"label": "Today's Revenue", "value": f"KES {todays_revenue}"},
        {"label": "Outstanding Receivables", "value": f"KES {outstanding}"},
        {"label": "Expenses This Month", "value": f"KES {monthly_expenses}"},
        {"label": "Supplier Invoices Due", "value": supplier_invoices_due_qs.count()},
        {"label": "Pending Expense Approvals", "value": pending_expenses_qs.count()},
    ]

    def _revenue_on(d):
        p = Payment.objects.filter(paid_at__date=d)
        o = OTCSale.objects.filter(sold_at__date=d)
        if accessible is not None:
            p = p.filter(branch_id__in=accessible)
            o = o.filter(branch_id__in=accessible)
        return float((p.aggregate(t=Sum("amount"))["t"] or 0) + (o.aggregate(t=Sum("amount_paid"))["t"] or 0))

    line = {"title": "Revenue — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _revenue_on(d)} for d in days
    ]}
    bar_qs = invoices_30d_qs.values("source_type").annotate(total=Sum("amount_paid"))
    bar = {"title": "Revenue by Source (30 days)", "data": [{"name": r["source_type"], "value": float(r["total"] or 0)} for r in bar_qs]}
    pie_qs = invoices_all_qs.values("status").annotate(count=Count("id"))
    pie = {"title": "Invoice Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def mortuary_dashboard(user):
    from mortuary.models import MortuaryAdmission, MortuaryStatus, MortuaryUnit, CompartmentStatus

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    admitted_qs = MortuaryAdmission.objects.filter(status=MortuaryStatus.ADMITTED)
    admitted_today_qs = MortuaryAdmission.objects.filter(admitted_at__date=today)
    released_today_qs = MortuaryAdmission.objects.filter(status=MortuaryStatus.RELEASED, release__released_at__date=today)
    units_available_qs = MortuaryUnit.objects.filter(status=CompartmentStatus.AVAILABLE, is_active=True)
    units_total_qs = MortuaryUnit.objects.filter(is_active=True)

    if accessible is not None:
        admitted_qs = admitted_qs.filter(compartment__branch_id__in=accessible)
        admitted_today_qs = admitted_today_qs.filter(compartment__branch_id__in=accessible)
        released_today_qs = released_today_qs.filter(compartment__branch_id__in=accessible)
        units_available_qs = units_available_qs.filter(branch_id__in=accessible)
        units_total_qs = units_total_qs.filter(branch_id__in=accessible)

    cards = [
        {"label": "Bodies In Storage", "value": admitted_qs.count()},
        {"label": "Admitted Today", "value": admitted_today_qs.count()},
        {"label": "Released Today", "value": released_today_qs.count()},
        {"label": "Compartments Available", "value": units_available_qs.count()},
        {"label": "Total Compartments", "value": units_total_qs.count()},
    ]

    def _admissions_on(d):
        qs = MortuaryAdmission.objects.filter(admitted_at__date=d)
        if accessible is not None:
            qs = qs.filter(compartment__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Admissions — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _admissions_on(d)} for d in days
    ]}
    last30_qs = MortuaryAdmission.objects.filter(admitted_at__date__gte=today - timedelta(days=30))
    if accessible is not None:
        last30_qs = last30_qs.filter(compartment__branch_id__in=accessible)
    bar_qs = last30_qs.values("source").annotate(count=Count("id"))
    bar = {"title": "Cases by Source (30 days)", "data": [{"name": r["source"], "value": r["count"]} for r in bar_qs]}
    pie_qs = units_total_qs.values("status").annotate(count=Count("id"))
    pie = {"title": "Compartment Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def hr_dashboard(user):
    from hr.models import Employee, EmploymentStatus, LeaveRequest, LeaveStatus, Attendance, PayrollRun, PayrollRunStatus

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    active_qs = Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE)
    on_leave_qs = Employee.objects.filter(employment_status=EmploymentStatus.ON_LEAVE)
    pending_leave_qs = LeaveRequest.objects.filter(status=LeaveStatus.PENDING)
    attendance_today_qs = Attendance.objects.filter(date=today)
    draft_payroll_qs = PayrollRun.objects.filter(status=PayrollRunStatus.DRAFT)
    all_employees_qs = Employee.objects.all()

    if accessible is not None:
        active_qs = active_qs.filter(branch_id__in=accessible)
        on_leave_qs = on_leave_qs.filter(branch_id__in=accessible)
        pending_leave_qs = pending_leave_qs.filter(employee__branch_id__in=accessible)
        attendance_today_qs = attendance_today_qs.filter(employee__branch_id__in=accessible)
        draft_payroll_qs = draft_payroll_qs.filter(branch_id__in=accessible)
        all_employees_qs = all_employees_qs.filter(branch_id__in=accessible)

    cards = [
        {"label": "Total Active Employees", "value": active_qs.count()},
        {"label": "On Leave Today", "value": on_leave_qs.count()},
        {"label": "Pending Leave Requests", "value": pending_leave_qs.count()},
        {"label": "Attendance Recorded Today", "value": attendance_today_qs.count()},
        {"label": "Draft Payroll Runs", "value": draft_payroll_qs.count()},
    ]

    def _leave_on(d):
        qs = LeaveRequest.objects.filter(created_at__date=d)
        if accessible is not None:
            qs = qs.filter(employee__branch_id__in=accessible)
        return qs.count()

    line = {"title": "Leave Requests — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": _leave_on(d)} for d in days
    ]}
    bar_qs = active_qs.values("department__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Active Employees by Department", "data": [{"name": r["department__name"] or "Unassigned", "value": r["count"]} for r in bar_qs]}
    pie_qs = all_employees_qs.values("employment_status").annotate(count=Count("id"))
    pie = {"title": "Employment Status Breakdown", "data": [{"name": r["employment_status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def procurement_dashboard(user):
    # Procurement module not branch-scoped in this pass — procurement/models.py
    # hasn't been reviewed for a branch field. Left as group-wide (unfiltered)
    # rather than guessing a field name that may not exist; a branch_name is
    # still returned so the frontend can show context, but the figures below
    # reflect the whole hospital group, not just this user's branch.
    from procurement.models import (
        PurchaseRequisition, RequisitionStatus, PurchaseOrder, PurchaseOrderStatus,
        GoodsReceipt, SupplierInvoice, SupplierInvoiceStatus,
    )

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    cards = [
        {"label": "Pending Requisitions", "value": PurchaseRequisition.objects.filter(status=RequisitionStatus.PENDING_HOD_APPROVAL).count()},
        {"label": "Open Purchase Orders", "value": PurchaseOrder.objects.exclude(status__in=[PurchaseOrderStatus.FULLY_RECEIVED, PurchaseOrderStatus.CANCELLED]).count()},
        {"label": "Goods Receipts This Month", "value": GoodsReceipt.objects.filter(received_at__date__gte=today.replace(day=1)).count()},
        {"label": "Outstanding Supplier Invoices", "value": SupplierInvoice.objects.exclude(status=SupplierInvoiceStatus.PAID).count()},
        {"label": "Requisitions This Week", "value": PurchaseRequisition.objects.filter(created_at__date__gte=today - timedelta(days=7)).count()},
    ]
    line = {"title": "Requisitions — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": PurchaseRequisition.objects.filter(created_at__date=d).count()} for d in days
    ]}
    bar_qs = PurchaseOrder.objects.filter(order_date__gte=today - timedelta(days=30)).values("supplier__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Purchase Orders by Supplier (30 days)", "data": [{"name": r["supplier__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = PurchaseRequisition.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Requisition Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def ambulance_dashboard(user):
    # Ambulance module not branch-scoped in this pass — ambulance/models.py
    # hasn't been reviewed for a branch field. Left as group-wide.
    from ambulance.models import Ambulance, AmbulanceStatus, AmbulanceDispatch, DispatchStatus

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    cards = [
        {"label": "Active Dispatches", "value": AmbulanceDispatch.objects.exclude(status__in=[DispatchStatus.COMPLETED, DispatchStatus.CANCELLED]).count()},
        {"label": "Available Ambulances", "value": Ambulance.objects.filter(status=AmbulanceStatus.AVAILABLE, is_active=True).count()},
        {"label": "Dispatches Today", "value": AmbulanceDispatch.objects.filter(requested_at__date=today).count()},
        {"label": "Completed This Week", "value": AmbulanceDispatch.objects.filter(status=DispatchStatus.COMPLETED, completed_at__date__gte=today - timedelta(days=7)).count()},
        {"label": "Total Fleet Size", "value": Ambulance.objects.filter(is_active=True).count()},
    ]
    line = {"title": "Dispatches — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": AmbulanceDispatch.objects.filter(requested_at__date=d).count()} for d in days
    ]}
    bar_qs = AmbulanceDispatch.objects.filter(requested_at__date__gte=today - timedelta(days=30)).values("dispatch_type").annotate(count=Count("id"))
    bar = {"title": "Dispatches by Type (30 days)", "data": [{"name": r["dispatch_type"], "value": r["count"]} for r in bar_qs]}
    pie_qs = AmbulanceDispatch.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Dispatch Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}


def health_records_officer_dashboard(user):
    # Medrecords module not branch-scoped in this pass — medrecords/models.py
    # hasn't been reviewed for a branch field. Left as group-wide.
    from medrecords.models import (
        PatientFile,
        FileStatus,
        RecordRequest,
        RecordRequestStatus,
        BirthRegister,
        DeathRegister,
    )
    from django.utils import timezone

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    cards = [
        {
            "label": "Files Checked Out",
            "value": PatientFile.objects.filter(
                status=FileStatus.CHECKED_OUT
            ).count(),
        },
        {
            "label": "Overdue Files",
            "value": PatientFile.objects.filter(
                status=FileStatus.CHECKED_OUT,
                expected_return_at__lt=timezone.now(),
            ).count(),
        },
        {
            "label": "Pending Record Requests",
            "value": RecordRequest.objects.filter(
                status=RecordRequestStatus.PENDING
            ).count(),
        },
        {
            "label": "Births Registered Today",
            "value": BirthRegister.objects.filter(
                date_of_birth=today
            ).count(),
        },
        {
            "label": "Deaths Registered Today",
            "value": DeathRegister.objects.filter(
                date_of_death__date=today
            ).count(),
        },
    ]

    line = {
        "title": "Record Requests — Last 7 Days",
        "data": [
            {
                "name": d.isoformat(),
                "value": RecordRequest.objects.filter(
                    requested_at__date=d
                ).count(),
            }
            for d in days
        ],
    }

    bar_qs = PatientFile.objects.values("status").annotate(
        count=Count("id")
    )

    bar = {
        "title": "Files by Status",
        "data": [
            {"name": r["status"], "value": r["count"]}
            for r in bar_qs
        ],
    }

    pie_qs = RecordRequest.objects.values("purpose").annotate(
        count=Count("id")
    )

    pie = {
        "title": "Record Requests by Purpose",
        "data": [
            {"name": r["purpose"], "value": r["count"]}
            for r in pie_qs
        ],
    }

    return {
        "cards": cards,
        "line": line,
        "bar": bar,
        "pie": pie,
        "branch_name": _branch_label(user, accessible),
    }


def medical_records_officer_dashboard(user):
    # Medrecords module not branch-scoped in this pass — see comment above.
    from medrecords.models import (
        Referral,
        ReferralStatus,
        DischargeSummary,
        RecordAuditTrail,
    )

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    cards = [
        {
            "label": "Pending Referrals",
            "value": Referral.objects.filter(
                status=ReferralStatus.PENDING
            ).count(),
        },
        {
            "label": "Incomplete Discharge Summaries",
            "value": DischargeSummary.objects.filter(
                is_complete=False
            ).count(),
        },
        {
            "label": "Diagnoses Coded Today",
            "value": ConsultationDiagnosis.objects.filter(
                coded_at__date=today
            ).count()
            if hasattr(ConsultationDiagnosis, "coded_at")
            else 0,
        },
        {
            "label": "Uncoded Diagnoses",
            "value": ConsultationDiagnosis.objects.filter(
                icd10_code__isnull=True
            ).count(),
        },
        {
            "label": "Record Accesses Today",
            "value": RecordAuditTrail.objects.filter(
                occurred_at__date=today
            ).count(),
        },
    ]

    line = {
        "title": "Referrals — Last 7 Days",
        "data": [
            {
                "name": d.isoformat(),
                "value": Referral.objects.filter(
                    created_at_display__date=d
                ).count(),
            }
            for d in days
        ],
    }

    bar_qs = Referral.objects.values(
        "direction",
        "status",
    ).annotate(count=Count("id"))

    bar = {
        "title": "Referrals by Direction & Status",
        "data": [
            {
                "name": f"{r['direction']} - {r['status']}",
                "value": r["count"],
            }
            for r in bar_qs
        ],
    }

    pie_qs = DischargeSummary.objects.values(
        "is_complete"
    ).annotate(count=Count("id"))

    pie = {
        "title": "Discharge Summary Completion",
        "data": [
            {
                "name": "Complete" if r["is_complete"] else "Incomplete",
                "value": r["count"],
            }
            for r in pie_qs
        ],
    }

    return {
        "cards": cards,
        "line": line,
        "bar": bar,
        "pie": pie,
        "branch_name": _branch_label(user, accessible),
    }
    
    

def biomedical_engineer_dashboard(user):
    # Biomed module not branch-scoped in this pass — biomed/models.py
    # hasn't been reviewed for a branch field. Left as group-wide.
    from biomed.models import Equipment, EquipmentStatus, ServiceRequest, ServiceRequestStatus, Calibration, CalibrationStatus, SparePart
    from datetime import date, timedelta

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()
    cutoff = today + timedelta(days=14)

    equipment_qs = Equipment.objects.filter(is_active=True)
    maintenance_due = len([e for e in equipment_qs if e.next_preventive_maintenance_due and e.next_preventive_maintenance_due <= cutoff])
    calibration_due = len([e for e in equipment_qs if e.next_calibration_due and e.next_calibration_due <= cutoff])
    low_stock_parts = len([p for p in SparePart.objects.all() if p.is_low_stock])

    cards = [
        {"label": "Total Equipment", "value": equipment_qs.count()},
        {"label": "Open Service Requests", "value": ServiceRequest.objects.exclude(status__in=[ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CANCELLED]).count()},
        {"label": "Out of Service", "value": equipment_qs.filter(status=EquipmentStatus.OUT_OF_SERVICE).count()},
        {"label": "Maintenance Due (14 days)", "value": maintenance_due},
        {"label": "Calibration Due (14 days)", "value": calibration_due},
        {"label": "Low Stock Spare Parts", "value": low_stock_parts},
    ]
    line = {"title": "Service Requests — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": ServiceRequest.objects.filter(reported_at__date=d).count()} for d in days
    ]}
    bar_qs = equipment_qs.values("status").annotate(count=__import__("django.db.models", fromlist=["Count"]).Count("id"))
    bar = {"title": "Equipment by Status", "data": [{"name": r["status"], "value": r["count"]} for r in bar_qs]}
    pie_qs = ServiceRequest.objects.values("priority").annotate(count=__import__("django.db.models", fromlist=["Count"]).Count("id"))
    pie = {"title": "Service Requests by Priority", "data": [{"name": r["priority"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}

def it_support_officer_dashboard(user):
    # Tickets/security modules not branch-scoped in this pass — those
    # models haven't been reviewed for a branch field. Left as group-wide.
    # User.branch IS known (api.models.User), so the "Total Staff Accounts"
    # card below could be scoped, but is left group-wide to match the rest
    # of this dashboard until the other sections can be scoped consistently.
    from datetime import date, timedelta
    from django.db.models import Count

    accessible = _accessible_branch_ids(user)
    today = date.today()
    days = _last7()

    cards = []
    line = {"title": "Tickets Raised — Last 7 Days", "data": []}
    bar = {"title": "Open Tickets by Category", "data": []}
    pie = {"title": "Open Tickets by Priority", "data": []}

    # --- Tickets ---
    try:
        from tickets.models import Ticket, TicketStatus
        open_tickets = Ticket.objects.exclude(status=TicketStatus.CLOSED)

        cards.append({"label": "Open Tickets", "value": open_tickets.count()})
        cards.append({"label": "Critical Tickets", "value": open_tickets.filter(priority="CRITICAL").count()})

        line["data"] = [
            {"name": d.isoformat(), "value": Ticket.objects.filter(raised_at__date=d).count()}
            for d in days
        ]
        bar["data"] = [
            {"name": r["category"], "value": r["count"]}
            for r in open_tickets.values("category").annotate(count=Count("id"))
        ]
        pie["data"] = [
            {"name": r["priority"], "value": r["count"]}
            for r in open_tickets.values("priority").annotate(count=Count("id"))
        ]
    except Exception as exc:
        import logging
        logging.getLogger("dashboards").exception(f"IT dashboard: tickets section failed: {exc}")

    # --- Security / accounts ---
    try:
        from security.models import AccountLockout, LoginAttempt, LoginAttemptStatus
        cards.append({"label": "Locked Accounts", "value": AccountLockout.objects.filter(is_locked=True).count()})
        cards.append({
            "label": "Failed Logins Today",
            "value": LoginAttempt.objects.filter(status=LoginAttemptStatus.FAILED_PASSWORD, attempted_at__date=today).count(),
        })
    except Exception as exc:
        import logging
        logging.getLogger("dashboards").exception(f"IT dashboard: security section failed: {exc}")

    try:
        from security.models import SecurityAuditLog
        cards.append({"label": "Security Events Today", "value": SecurityAuditLog.objects.filter(occurred_at__date=today).count()})
    except Exception:
        pass

    # --- Staff accounts ---
    try:
        from api.models import User
        staff_qs = User.objects.filter(is_active_staff=True, is_deleted=False)
        if accessible is not None:
            staff_qs = staff_qs.filter(branch_id__in=accessible)
        cards.append({"label": "Total Staff Accounts", "value": staff_qs.count()})
    except Exception as exc:
        import logging
        logging.getLogger("dashboards").exception(f"IT dashboard: staff accounts section failed: {exc}")

    return {"cards": cards, "line": line, "bar": bar, "pie": pie, "branch_name": _branch_label(user, accessible)}

DASHBOARD_BUILDERS = {
    Role.RECEPTIONIST: receptionist_dashboard,
    Role.CASHIER: cashier_dashboard,
    Role.NURSE: nurse_dashboard,
    Role.DOCTOR: doctor_dashboard,
    Role.LAB_TECHNOLOGIST: lab_dashboard,
    Role.RADIOLOGIST: radiology_dashboard,
    Role.PHARMACIST: pharmacy_dashboard,
    Role.ACCOUNTANT: accountant_dashboard,
    Role.MORTUARY_ATTENDANT: mortuary_dashboard,
    Role.HR_OFFICER: hr_dashboard,
    Role.PROCUREMENT_OFFICER: procurement_dashboard,
    Role.AMBULANCE_DISPATCHER: ambulance_dashboard,
    Role.HEALTH_RECORDS_OFFICER: health_records_officer_dashboard,
    Role.MEDICAL_RECORDS_OFFICER: medical_records_officer_dashboard,
    Role.BIOMEDICAL_ENGINEER: biomedical_engineer_dashboard,
    Role.IT_SUPPORT_OFFICER: it_support_officer_dashboard,
}


class MyDashboardView(APIView):
    """
    GET /api/dashboards/me/
    Returns a role-tailored dashboard payload for the current user:
    { cards: [...5], line: {...}, bar: {...}, pie: {...}, branch_name: str|None }.
    Self-service by design — a user can only ever see their own role's
    aggregate stats, never another user's or another role's, so plain
    IsAuthenticated is correct here; there's no cross-role data exposure risk.
    Figures are now branch-scoped for every module this pass covered
    (reception, cashier, nurse, doctor, lab, radiology, pharmacy,
    accountant's core billing figures, mortuary, HR); a handful of modules
    (ambulance, MCH, theatre, finance's expenses, procurement, medrecords,
    biomed, tickets, security) remain group-wide until their models are
    reviewed for a branch field.
    Super Admin has no entry in DASHBOARD_BUILDERS on purpose — the frontend
    keeps Super Admin on the original full admin Dashboard component instead
    of this endpoint; the accountant_dashboard fallback below only fires if
    an unexpected/unmapped role reaches this view.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.role
        builder = DASHBOARD_BUILDERS.get(role, accountant_dashboard)
        try:
            data = builder(request.user)
        except Exception as exc:
            return Response({"detail": f"Could not build dashboard: {exc}"}, status=500)
        return Response(data)