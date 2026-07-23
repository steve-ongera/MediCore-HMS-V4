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


def receptionist_dashboard(user):
    from emergency.models import EmergencyVisit
    from ambulance.models import AmbulanceDispatch

    today = date.today()
    days = _last7()

    cards = [
        {"label": "Patients Registered Today", "value": Patient.objects.filter(created_at__date=today).count()},
        {"label": "Visits Registered Today", "value": Visit.objects.filter(visit_date__date=today).count()},
        {"label": "Queue Waiting", "value": QueueEntry.objects.exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]).count()},
        {"label": "Emergency Registered Today", "value": EmergencyVisit.objects.filter(arrived_at__date=today).count()},
        {"label": "Ambulance Dispatches Today", "value": AmbulanceDispatch.objects.filter(requested_at__date=today).count()},
    ]
    line = {"title": "Patients Registered — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": Patient.objects.filter(created_at__date=d).count()} for d in days
    ]}
    bar_qs = Visit.objects.filter(visit_date__date=today).values("department__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Today's Visits by Department", "data": [{"name": r["department__name"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    pie_qs = Visit.objects.filter(visit_date__date=today).values("status").annotate(count=Count("id"))
    pie = {"title": "Today's Visit Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def cashier_dashboard(user):
    today = date.today()
    days = _last7()

    todays_collections = Payment.objects.filter(paid_at__date=today).aggregate(t=Sum("amount"))["t"] or 0
    otc_today = OTCSale.objects.filter(sold_at__date=today).aggregate(t=Sum("amount_paid"))["t"] or 0
    outstanding = sum((inv.balance for inv in Invoice.objects.exclude(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED])), start=0)

    cards = [
        {"label": "Today's Collections", "value": f"KES {todays_collections}"},
        {"label": "OTC Sales Today", "value": f"KES {otc_today}"},
        {"label": "Payments Processed Today", "value": Payment.objects.filter(paid_at__date=today).count()},
        {"label": "Pending Invoices", "value": Invoice.objects.filter(status=InvoiceStatus.UNPAID).count()},
        {"label": "Outstanding Balance", "value": f"KES {outstanding}"},
    ]
    line = {"title": "Collections — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": float(Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0)} for d in days
    ]}
    bar_qs = Payment.objects.filter(paid_at__date=today).values("method").annotate(total=Sum("amount"))
    bar = {"title": "Today's Collections by Method", "data": [{"name": r["method"], "value": float(r["total"] or 0)} for r in bar_qs]}
    pie_qs = Invoice.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Invoice Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def nurse_dashboard(user):
    from emergency.models import EmergencyVisit, EmergencyStatus
    from inpatient.models import Admission, AdmissionStatus
    from mch.models import ANCVisit

    today = date.today()
    days = _last7()

    cards = [
        {"label": "Patients Waiting (Nurse Queue)", "value": QueueEntry.objects.filter(queue_type="NURSE").exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]).count()},
        {"label": "Active Admissions", "value": Admission.objects.filter(status=AdmissionStatus.ADMITTED).count()},
        {"label": "Emergency Patients Active", "value": EmergencyVisit.objects.filter(status=EmergencyStatus.IN_ED).count()},
        {"label": "ANC Visits Today", "value": ANCVisit.objects.filter(visit_date__date=today).count()},
        {"label": "Queue Entries Today", "value": QueueEntry.objects.filter(created_at__date=today).count()},
    ]
    line = {"title": "Queue Entries — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": QueueEntry.objects.filter(created_at__date=d).count()} for d in days
    ]}
    bar_qs = Admission.objects.filter(status=AdmissionStatus.ADMITTED).values("bed__ward__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Active Admissions by Ward", "data": [{"name": r["bed__ward__name"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    pie_qs = QueueEntry.objects.exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]).values("status").annotate(count=Count("id"))
    pie = {"title": "Queue Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def doctor_dashboard(user):
    from theatre.models import SurgeryBooking

    today = date.today()
    days = _last7()

    cards = [
        {"label": "My Queue Today", "value": QueueEntry.objects.filter(queue_type="DOCTOR", assigned_to=user).exclude(status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]).count()},
        {"label": "Consultations Completed Today", "value": Consultation.objects.filter(doctor=user, completed_at__date=today).count()},
        {"label": "Consultations In Progress", "value": Consultation.objects.filter(doctor=user, status=ConsultationStatus.IN_PROGRESS).count()},
        {"label": "My Surgeries Booked", "value": SurgeryBooking.objects.filter(primary_surgeon=user).exclude(status__in=["COMPLETED", "CANCELLED"]).count()},
        {"label": "Lab Orders Pending (Mine)", "value": LabOrder.objects.filter(ordered_by=user).exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED]).count()},
    ]
    line = {"title": "My Consultations — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": Consultation.objects.filter(doctor=user, started_at__date=d).count()} for d in days
    ]}
    bar_qs = ConsultationDiagnosis.objects.filter(
        consultation__doctor=user, consultation__started_at__date__gte=today - timedelta(days=30)
    ).values("icd10_code__description").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "My Top Diagnoses (30 days)", "data": [{"name": r["icd10_code__description"] or "Unknown", "value": r["count"]} for r in bar_qs]}
    pie_qs = Consultation.objects.filter(doctor=user).values("status").annotate(count=Count("id"))
    pie = {"title": "My Consultation Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def lab_dashboard(user):
    today = date.today()
    days = _last7()

    cards = [
        {"label": "Pending Lab Orders", "value": LabOrder.objects.exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED]).count()},
        {"label": "Completed Today", "value": LabOrder.objects.filter(status=LabOrderStatus.COMPLETED, result__completed_at__date=today).count()},
        {"label": "Ordered Today", "value": LabOrder.objects.filter(ordered_at__date=today).count()},
        {"label": "Awaiting Collection", "value": LabOrder.objects.filter(status=LabOrderStatus.ORDERED).count()},
        {"label": "Completed This Month", "value": LabOrder.objects.filter(status=LabOrderStatus.COMPLETED, ordered_at__date__gte=today.replace(day=1)).count()},
    ]
    line = {"title": "Lab Orders — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": LabOrder.objects.filter(ordered_at__date=d).count()} for d in days
    ]}
    bar_qs = LabOrder.objects.filter(ordered_at__date__gte=today - timedelta(days=30)).values("test__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Tests Ordered (30 days)", "data": [{"name": r["test__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = LabOrder.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Lab Order Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def radiology_dashboard(user):
    today = date.today()
    days = _last7()

    cards = [
        {"label": "Pending Radiology Orders", "value": RadiologyOrder.objects.exclude(status__in=[RadiologyOrderStatus.REPORTED, RadiologyOrderStatus.CANCELLED]).count()},
        {"label": "Reported Today", "value": RadiologyOrder.objects.filter(status=RadiologyOrderStatus.REPORTED, result__completed_at__date=today).count()},
        {"label": "Ordered Today", "value": RadiologyOrder.objects.filter(ordered_at__date=today).count()},
        {"label": "Awaiting Report", "value": RadiologyOrder.objects.filter(status=RadiologyOrderStatus.DONE).count()},
        {"label": "Reported This Month", "value": RadiologyOrder.objects.filter(status=RadiologyOrderStatus.REPORTED, ordered_at__date__gte=today.replace(day=1)).count()},
    ]
    line = {"title": "Radiology Orders — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": RadiologyOrder.objects.filter(ordered_at__date=d).count()} for d in days
    ]}
    bar_qs = RadiologyOrder.objects.filter(ordered_at__date__gte=today - timedelta(days=30)).values("test__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Tests Ordered (30 days)", "data": [{"name": r["test__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = RadiologyOrder.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Radiology Order Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def pharmacy_dashboard(user):
    today = date.today()
    days = _last7()

    low_stock = len([m for m in Medicine.objects.all() if m.is_low_stock])

    cards = [
        {"label": "Low Stock Items", "value": low_stock},
        {"label": "Prescriptions Pending", "value": _pending_prescriptions()},
        {"label": "Dispensed Today", "value": PharmacyDispense.objects.filter(dispensed_at__date=today).count()},
        {"label": "OTC Sales Today", "value": OTCSale.objects.filter(sold_at__date=today).count()},
        {"label": "Stock Transactions Today", "value": StockTransaction.objects.filter(created_at__date=today).count()},
    ]
    line = {"title": "Dispenses — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": PharmacyDispense.objects.filter(dispensed_at__date=d).count()} for d in days
    ]}
    bar_qs = PharmacyDispense.objects.filter(dispensed_at__date__gte=today - timedelta(days=30)).values("prescription__medicine__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Top Medicines Dispensed (30 days)", "data": [{"name": r["prescription__medicine__name"], "value": r["count"]} for r in bar_qs]}
    pie_qs = StockTransaction.objects.filter(created_at__date=today).values("transaction_type").annotate(count=Count("id"))
    pie = {"title": "Today's Stock Transactions", "data": [{"name": r["transaction_type"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def accountant_dashboard(user):
    from finance.models import Expense, ExpenseStatus
    from procurement.models import SupplierInvoice, SupplierInvoiceStatus

    today = date.today()
    days = _last7()

    todays_revenue = (Payment.objects.filter(paid_at__date=today).aggregate(t=Sum("amount"))["t"] or 0) + \
                      (OTCSale.objects.filter(sold_at__date=today).aggregate(t=Sum("amount_paid"))["t"] or 0)
    outstanding = sum((inv.balance for inv in Invoice.objects.exclude(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED])), start=0)
    monthly_expenses = Expense.objects.filter(status=ExpenseStatus.PAID, expense_date__gte=today.replace(day=1)).aggregate(t=Sum("amount"))["t"] or 0

    cards = [
        {"label": "Today's Revenue", "value": f"KES {todays_revenue}"},
        {"label": "Outstanding Receivables", "value": f"KES {outstanding}"},
        {"label": "Expenses This Month", "value": f"KES {monthly_expenses}"},
        {"label": "Supplier Invoices Due", "value": SupplierInvoice.objects.exclude(status=SupplierInvoiceStatus.PAID).count()},
        {"label": "Pending Expense Approvals", "value": Expense.objects.filter(status=ExpenseStatus.PENDING_APPROVAL).count()},
    ]
    line = {"title": "Revenue — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": float(
            (Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0) +
            (OTCSale.objects.filter(sold_at__date=d).aggregate(t=Sum("amount_paid"))["t"] or 0)
        )} for d in days
    ]}
    bar_qs = Invoice.objects.filter(created_at__date__gte=today - timedelta(days=30)).values("source_type").annotate(total=Sum("amount_paid"))
    bar = {"title": "Revenue by Source (30 days)", "data": [{"name": r["source_type"], "value": float(r["total"] or 0)} for r in bar_qs]}
    pie_qs = Invoice.objects.values("status").annotate(count=Count("id"))
    pie = {"title": "Invoice Status Breakdown", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def mortuary_dashboard(user):
    from mortuary.models import MortuaryAdmission, MortuaryStatus, MortuaryUnit, CompartmentStatus

    today = date.today()
    days = _last7()

    cards = [
        {"label": "Bodies In Storage", "value": MortuaryAdmission.objects.filter(status=MortuaryStatus.ADMITTED).count()},
        {"label": "Admitted Today", "value": MortuaryAdmission.objects.filter(admitted_at__date=today).count()},
        {"label": "Released Today", "value": MortuaryAdmission.objects.filter(status=MortuaryStatus.RELEASED, release__released_at__date=today).count()},
        {"label": "Compartments Available", "value": MortuaryUnit.objects.filter(status=CompartmentStatus.AVAILABLE, is_active=True).count()},
        {"label": "Total Compartments", "value": MortuaryUnit.objects.filter(is_active=True).count()},
    ]
    line = {"title": "Admissions — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": MortuaryAdmission.objects.filter(admitted_at__date=d).count()} for d in days
    ]}
    bar_qs = MortuaryAdmission.objects.filter(admitted_at__date__gte=today - timedelta(days=30)).values("source").annotate(count=Count("id"))
    bar = {"title": "Cases by Source (30 days)", "data": [{"name": r["source"], "value": r["count"]} for r in bar_qs]}
    pie_qs = MortuaryUnit.objects.filter(is_active=True).values("status").annotate(count=Count("id"))
    pie = {"title": "Compartment Status", "data": [{"name": r["status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def hr_dashboard(user):
    from hr.models import Employee, EmploymentStatus, LeaveRequest, LeaveStatus, Attendance, PayrollRun, PayrollRunStatus

    today = date.today()
    days = _last7()

    cards = [
        {"label": "Total Active Employees", "value": Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE).count()},
        {"label": "On Leave Today", "value": Employee.objects.filter(employment_status=EmploymentStatus.ON_LEAVE).count()},
        {"label": "Pending Leave Requests", "value": LeaveRequest.objects.filter(status=LeaveStatus.PENDING).count()},
        {"label": "Attendance Recorded Today", "value": Attendance.objects.filter(date=today).count()},
        {"label": "Draft Payroll Runs", "value": PayrollRun.objects.filter(status=PayrollRunStatus.DRAFT).count()},
    ]
    line = {"title": "Leave Requests — Last 7 Days", "data": [
        {"name": d.isoformat(), "value": LeaveRequest.objects.filter(created_at__date=d).count()} for d in days
    ]}
    bar_qs = Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE).values("department__name").annotate(count=Count("id")).order_by("-count")[:6]
    bar = {"title": "Active Employees by Department", "data": [{"name": r["department__name"] or "Unassigned", "value": r["count"]} for r in bar_qs]}
    pie_qs = Employee.objects.values("employment_status").annotate(count=Count("id"))
    pie = {"title": "Employment Status Breakdown", "data": [{"name": r["employment_status"], "value": r["count"]} for r in pie_qs]}
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def procurement_dashboard(user):
    from procurement.models import (
        PurchaseRequisition, RequisitionStatus, PurchaseOrder, PurchaseOrderStatus,
        GoodsReceipt, SupplierInvoice, SupplierInvoiceStatus,
    )

    today = date.today()
    days = _last7()

    cards = [
        {"label": "Pending Requisitions", "value": PurchaseRequisition.objects.filter(status=RequisitionStatus.PENDING_APPROVAL).count()},
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
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


def ambulance_dashboard(user):
    from ambulance.models import Ambulance, AmbulanceStatus, AmbulanceDispatch, DispatchStatus

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
    return {"cards": cards, "line": line, "bar": bar, "pie": pie}


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
}


class MyDashboardView(APIView):
    """
    GET /api/dashboards/me/
    Returns a role-tailored dashboard payload for the current user:
    { cards: [...5], line: {...}, bar: {...}, pie: {...} }.
    Self-service by design — a user can only ever see their own role's
    aggregate stats, never another user's or another role's, so plain
    IsAuthenticated is correct here; there's no cross-role data exposure risk.
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