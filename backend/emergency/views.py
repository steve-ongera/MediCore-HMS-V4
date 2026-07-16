from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet, OutOfStockError
from api.models import Patient, Invoice, MedicineBatch, StockTransaction, StockTransactionType
from api.serializers import InvoiceSerializer
from api.permissions import ReadOnlyOrSuperAdmin

from inpatient.models import Bed, BedStatus, Admission

from .models import (
    EmergencyBay, BayStatus, EmergencyVisit, EmergencyStatus,
    TriageVitals, EmergencyNote, EmergencyProcedureCatalog, EmergencyProcedure,
    EmergencyProcedureStatus, EmergencyMedicationOrder, EmergencyMedicationAdministration,
    EmergencyAdministrationStatus, EmergencyBayCharge,
)
from .serializers import (
    EmergencyBaySerializer, EmergencyVisitSerializer, EmergencyVisitListSerializer,
    RegisterEmergencySerializer, TriageVitalsSerializer, EmergencyNoteSerializer,
    EmergencyProcedureCatalogSerializer, EmergencyProcedureSerializer,
    OrderEmergencyProcedureSerializer, EmergencyMedicationOrderSerializer,
    EmergencyMedicationAdministrationSerializer, DischargeHomeSerializer,
    TransferToAdmissionSerializer, LamaSerializer, DeceasedSerializer,
    AddEmergencyChargeSerializer,
)
from .services import ensure_emergency_visit, raise_emergency_invoice, charge_bay_time, REGISTRATION_FEE


class EmergencyBayViewSet(BaseModelViewSet):
    queryset = EmergencyBay.objects.filter(is_active=True)
    serializer_class = EmergencyBaySerializer
    filterset_fields = ["zone", "status"]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        qs = self.get_queryset().filter(status=BayStatus.AVAILABLE)
        return Response(EmergencyBaySerializer(qs, many=True).data)


class EmergencyVisitViewSet(BaseModelViewSet):
    queryset = EmergencyVisit.objects.select_related("patient", "bay", "attending_doctor").all()
    filterset_fields = ["status", "triage_level", "arrival_mode"]
    search_fields = ["visit_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return EmergencyVisitListSerializer
        return EmergencyVisitSerializer

    def create(self, request, *args, **kwargs):
        serializer = RegisterEmergencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        bay = None
        if data.get("bay"):
            bay = EmergencyBay.objects.filter(pk=data["bay"]).first()
            if not bay:
                raise ValidationError({"bay": "Bay not found."})
            if bay.status != BayStatus.AVAILABLE:
                raise ValidationError({"bay": "Bay is not available."})

        with transaction.atomic():
            visit = ensure_emergency_visit(patient, doctor_id=data.get("attending_doctor"), registered_by=request.user) \
                if False else ensure_emergency_visit(patient, registered_by=request.user)

            ed_visit = EmergencyVisit.objects.create(
                patient=patient,
                visit=visit,
                bay=bay,
                triage_level=data.get("triage_level"),
                arrival_mode=data.get("arrival_mode", "WALK_IN"),
                chief_complaint=data.get("chief_complaint", ""),
                attending_doctor_id=data.get("attending_doctor"),
                registered_by=request.user,
            )

            if bay:
                bay.status = BayStatus.OCCUPIED
                bay.save(update_fields=["status"])

            raise_emergency_invoice(patient, visit, f"ED Registration - {ed_visit.visit_number}", REGISTRATION_FEE)

        return Response(EmergencyVisitSerializer(ed_visit).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(status=EmergencyStatus.IN_ED)
        return Response(EmergencyVisitListSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="billing")
    def billing(self, request, pk=None):
        ed_visit = self.get_object()
        if not ed_visit.visit:
            with transaction.atomic():
                ed_visit.visit = ensure_emergency_visit(ed_visit.patient, registered_by=request.user)
                ed_visit.save(update_fields=["visit"])

        invoices = Invoice.objects.filter(visit=ed_visit.visit).order_by("created_at")
        breakdown = {}
        grand_total = 0
        amount_paid = 0
        for inv in invoices:
            bucket = breakdown.setdefault(inv.source_type, {"count": 0, "total": 0, "paid": 0})
            bucket["count"] += 1
            bucket["total"] += inv.amount
            bucket["paid"] += inv.amount_paid
            grand_total += inv.amount
            amount_paid += inv.amount_paid

        return Response({
            "visit_number": ed_visit.visit_number,
            "patient_name": ed_visit.patient.full_name,
            "invoices": InvoiceSerializer(invoices, many=True).data,
            "breakdown": {k: {"count": v["count"], "total": str(v["total"]), "paid": str(v["paid"])} for k, v in breakdown.items()},
            "grand_total": str(grand_total),
            "amount_paid": str(amount_paid),
            "balance": str(grand_total - amount_paid),
        })

    @action(detail=True, methods=["post"], url_path="add-charge")
    def add_charge(self, request, pk=None):
        ed_visit = self.get_object()
        serializer = AddEmergencyChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            visit = ed_visit.visit or ensure_emergency_visit(ed_visit.patient, registered_by=request.user)
            if not ed_visit.visit:
                ed_visit.visit = visit
                ed_visit.save(update_fields=["visit"])
            invoice = raise_emergency_invoice(
                ed_visit.patient, visit,
                f"{serializer.validated_data['description']} ({ed_visit.visit_number})",
                serializer.validated_data["amount"],
            )
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="order-procedure")
    def order_procedure(self, request, pk=None):
        ed_visit = self.get_object()
        serializer = OrderEmergencyProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        procedure = EmergencyProcedureCatalog.objects.filter(pk=serializer.validated_data["procedure"], is_active=True).first()
        if not procedure:
            raise ValidationError({"procedure": "Procedure not found."})

        with transaction.atomic():
            visit = ed_visit.visit or ensure_emergency_visit(ed_visit.patient, registered_by=request.user)
            if not ed_visit.visit:
                ed_visit.visit = visit
                ed_visit.save(update_fields=["visit"])

            proc = EmergencyProcedure.objects.create(
                emergency_visit=ed_visit, procedure=procedure,
                notes=serializer.validated_data.get("notes", ""), ordered_by=request.user,
            )
            invoice = raise_emergency_invoice(
                ed_visit.patient, visit, f"Procedure - {procedure.name} ({ed_visit.visit_number})", procedure.price,
            )
            proc.invoice = invoice
            proc.save(update_fields=["invoice"])

        return Response(EmergencyProcedureSerializer(proc).data, status=status.HTTP_201_CREATED)

    # -----------------------------------------------------------------
    # Disposition actions
    # -----------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="discharge-home")
    def discharge_home(self, request, pk=None):
        ed_visit = self.get_object()
        if ed_visit.status != EmergencyStatus.IN_ED:
            raise ValidationError({"detail": "This ED encounter is already closed."})

        serializer = DischargeHomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            ed_visit.disposition_at = timezone.now()
            ed_visit.disposition_notes = serializer.validated_data.get("disposition_notes", "")
            ed_visit.status = EmergencyStatus.DISCHARGED
            ed_visit.save(update_fields=["disposition_at", "disposition_notes", "status"])

            charge_bay_time(ed_visit, user=request.user)

            if ed_visit.bay:
                ed_visit.bay.status = BayStatus.AVAILABLE
                ed_visit.bay.save(update_fields=["status"])

        return Response(EmergencyVisitSerializer(ed_visit).data)

    @action(detail=True, methods=["post"], url_path="transfer-to-admission")
    def transfer_to_admission(self, request, pk=None):
        """
        Closes the ED encounter and opens a real inpatient Admission, linked
        back via emergency_visit.admission. ED bay time is billed up to this
        point; the ward stay bills separately from there via Inpatient's own
        billing, matching how a real ED-to-ward handoff works.
        """
        ed_visit = self.get_object()
        if ed_visit.status != EmergencyStatus.IN_ED:
            raise ValidationError({"detail": "This ED encounter is already closed."})

        serializer = TransferToAdmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        bed = Bed.objects.select_related("ward").filter(pk=data["bed"]).first()
        if not bed:
            raise ValidationError({"bed": "Bed not found."})
        if bed.status != BedStatus.AVAILABLE:
            raise ValidationError({"bed": "Bed is not available."})

        with transaction.atomic():
            admission = Admission.objects.create(
                patient=ed_visit.patient,
                bed=bed,
                admitting_doctor_id=data["admitting_doctor"],
                attending_doctor_id=data.get("attending_doctor") or data["admitting_doctor"],
                admitted_by=request.user,
                admission_type=data.get("admission_type", "EMERGENCY"),
                admission_diagnosis=data.get("admission_diagnosis", ""),
            )
            bed.status = BedStatus.OCCUPIED
            bed.save(update_fields=["status"])

            ed_visit.disposition_at = timezone.now()
            ed_visit.disposition_notes = data.get("disposition_notes", "")
            ed_visit.status = EmergencyStatus.ADMITTED
            ed_visit.admission = admission
            ed_visit.save(update_fields=["disposition_at", "disposition_notes", "status", "admission"])

            charge_bay_time(ed_visit, user=request.user)

            if ed_visit.bay:
                ed_visit.bay.status = BayStatus.AVAILABLE
                ed_visit.bay.save(update_fields=["status"])

        return Response(EmergencyVisitSerializer(ed_visit).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="lama")
    def lama(self, request, pk=None):
        ed_visit = self.get_object()
        if ed_visit.status != EmergencyStatus.IN_ED:
            raise ValidationError({"detail": "This ED encounter is already closed."})
        serializer = LamaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            ed_visit.disposition_at = timezone.now()
            ed_visit.disposition_notes = serializer.validated_data.get("disposition_notes", "")
            ed_visit.status = EmergencyStatus.LAMA
            ed_visit.save(update_fields=["disposition_at", "disposition_notes", "status"])
            charge_bay_time(ed_visit, user=request.user)
            if ed_visit.bay:
                ed_visit.bay.status = BayStatus.AVAILABLE
                ed_visit.bay.save(update_fields=["status"])

        return Response(EmergencyVisitSerializer(ed_visit).data)

    @action(detail=True, methods=["post"], url_path="deceased")
    def deceased(self, request, pk=None):
        ed_visit = self.get_object()
        if ed_visit.status != EmergencyStatus.IN_ED:
            raise ValidationError({"detail": "This ED encounter is already closed."})
        serializer = DeceasedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            ed_visit.disposition_at = timezone.now()
            ed_visit.disposition_notes = serializer.validated_data.get("disposition_notes", "")
            ed_visit.status = EmergencyStatus.DECEASED
            ed_visit.save(update_fields=["disposition_at", "disposition_notes", "status"])
            charge_bay_time(ed_visit, user=request.user)
            if ed_visit.bay:
                ed_visit.bay.status = BayStatus.AVAILABLE
                ed_visit.bay.save(update_fields=["status"])

        return Response(EmergencyVisitSerializer(ed_visit).data)


class TriageVitalsViewSet(BaseModelViewSet):
    queryset = TriageVitals.objects.all()
    serializer_class = TriageVitalsSerializer
    filterset_fields = ["emergency_visit"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class EmergencyNoteViewSet(BaseModelViewSet):
    queryset = EmergencyNote.objects.select_related("author").all()
    serializer_class = EmergencyNoteSerializer
    filterset_fields = ["emergency_visit"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class EmergencyProcedureCatalogViewSet(BaseModelViewSet):
    queryset = EmergencyProcedureCatalog.objects.filter(is_active=True)
    serializer_class = EmergencyProcedureCatalogSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]


class EmergencyProcedureViewSet(BaseModelViewSet):
    queryset = EmergencyProcedure.objects.select_related("procedure", "emergency_visit").all()
    serializer_class = EmergencyProcedureSerializer
    filterset_fields = ["emergency_visit", "status"]

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        proc = self.get_object()
        proc.status = EmergencyProcedureStatus.COMPLETED
        proc.performed_by = request.user
        proc.completed_at = timezone.now()
        proc.save(update_fields=["status", "performed_by", "completed_at"])
        return Response(EmergencyProcedureSerializer(proc).data)


class EmergencyMedicationOrderViewSet(BaseModelViewSet):
    queryset = EmergencyMedicationOrder.objects.select_related("medicine").all()
    serializer_class = EmergencyMedicationOrderSerializer
    filterset_fields = ["emergency_visit", "is_active"]

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)


class EmergencyMedicationAdministrationViewSet(BaseModelViewSet):
    queryset = EmergencyMedicationAdministration.objects.select_related("medication_order__medicine").all()
    serializer_class = EmergencyMedicationAdministrationSerializer
    filterset_fields = ["medication_order", "status"]

    def perform_create(self, serializer):
        order = serializer.validated_data["medication_order"]
        status_value = serializer.validated_data.get("status", EmergencyAdministrationStatus.GIVEN)

        if status_value != EmergencyAdministrationStatus.GIVEN:
            serializer.save(administered_by=self.request.user)
            return

        medicine = order.medicine
        quantity = order.quantity
        batch = (
            MedicineBatch.objects.filter(medicine=medicine, quantity_remaining__gte=quantity)
            .order_by("expiry_date").first()
        )
        if not batch:
            raise OutOfStockError(f"{medicine.name} is out of stock.")

        with transaction.atomic():
            admin_record = serializer.save(administered_by=self.request.user, batch=batch)

            batch.quantity_remaining -= quantity
            batch.save(update_fields=["quantity_remaining"])

            StockTransaction.objects.create(
                medicine=medicine, batch=batch, transaction_type=StockTransactionType.STOCK_OUT,
                quantity=quantity, reason=f"ED administration - {order.emergency_visit.visit_number}",
                performed_by=self.request.user,
            )

            ed_visit = order.emergency_visit
            visit = ed_visit.visit or ensure_emergency_visit(ed_visit.patient, registered_by=self.request.user)
            if not ed_visit.visit:
                ed_visit.visit = visit
                ed_visit.save(update_fields=["visit"])

            invoice = raise_emergency_invoice(
                ed_visit.patient, visit,
                f"ED Medication - {medicine.name} x{quantity} ({ed_visit.visit_number})",
                medicine.unit_price * quantity,
            )
            admin_record.invoice = invoice
            admin_record.save(update_fields=["invoice"])