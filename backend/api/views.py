from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView  # noqa: F401 (re-exported via urls)
from django.core.exceptions import ValidationError
from rest_framework import mixins

from api.middleware import set_current_user
from api.models import (
    User, Role, Department, Patient, Allergy, MedicalHistoryNote, Visit,
    VisitStatus, Invoice, Payment, QueueEntry, QueueType, QueueStatus,
    VitalSigns, ICD10Code, Consultation, ConsultationStatus, ConsultationDiagnosis,
    Prescription, LabTestCatalog, LabOrder, LabOrderStatus, LabResult,
    RadiologyTestCatalog, RadiologyOrder, RadiologyOrderStatus, RadiologyResult,
    Supplier, Medicine, MedicineBatch, StockTransaction, StockTransactionType,
    PharmacyDispense, AuditLog, InvoiceSourceType, OTCSale, OTCSaleItem, BulkPayment , BulkPaymentLine
)
from api.models import Patient, Visit, ConsultationDiagnosis, ICD10Code
from api.permissions import (
    HasRole, IsReceptionist, IsCashierOrAccountant, IsNurse, IsDoctor,
    IsLabTechnologist, IsRadiologist, IsPharmacist, ReadOnlyOrSuperAdmin, IsSuperAdmin, IsITSupportOrSuperAdmin
)
from licensing.permissions import WithinUserLimit

from finance.permissions import RequiresOpenTill
from api.filters import (
    PatientFilter, VisitFilter, InvoiceFilter, PaymentFilter, QueueEntryFilter,
    LabOrderFilter, RadiologyOrderFilter, MedicineFilter, MedicineBatchFilter,
)
from api.serializers import (
    UserSerializer, UserCreateSerializer, ChangePasswordSerializer, AdminResetPasswordSerializer,
    DepartmentSerializer,
    PatientSerializer, PatientSearchResultSerializer, AllergySerializer, MedicalHistoryNoteSerializer,
    VisitSerializer, InvoiceSerializer, PaymentSerializer, QueueEntrySerializer, VitalSignsSerializer,
    ICD10CodeSerializer, ConsultationSerializer, ConsultationPauseSerializer, ConsultationDiagnosisSerializer,
    PrescriptionSerializer, LabTestCatalogSerializer, LabOrderSerializer, LabResultSerializer,
    RadiologyTestCatalogSerializer, RadiologyOrderSerializer, RadiologyResultSerializer,
    SupplierSerializer, MedicineSerializer, MedicineBatchSerializer, StockTransactionSerializer,
    PharmacyDispenseSerializer, AuditLogSerializer, OTCSaleSerializer, OTCSaleCreateSerializer,
    TransactionSerializer, CreateBulkPaymentSerializer, BulkPaymentLineSerializer , BulkPaymentSerializer , PrepareDispenseSerializer
)
from api.utils import generate_qr_code
from datetime import date, timedelta
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status

from api.models import ConsultationProcedure, InvoiceSourceType
from api.serializers import AddConsultationProcedureSerializer, ConsultationProcedureSerializer


from datetime import date, timedelta
from django.db.models import Count

from tickets.models import Ticket, TicketStatus
from security.models import AccountLockout, LoginAttempt, LoginAttemptStatus, SecurityAuditLog
from api.models import Medicine



# ---------------------------------------------------------------------------
# Base ViewSet: keeps thread-local user in sync (for audit signals) and
# gives every subclass search + ordering + pagination + filtering for free.
# ---------------------------------------------------------------------------
class BaseModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        set_current_user(request.user)

    def perform_destroy(self, instance):
        # Global soft-delete: never hard-delete clinical/financial records.
        instance.soft_delete()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from security.models import AccountLockout, LoginAttemptStatus, AuditEventType
from security.services import (
    record_failed_attempt, reset_lockout, create_and_send_otp, verify_otp,
    start_session, log_audit_event,
)
from security.utils import get_client_ip


class LoginView(APIView):
    """
    POST /api/auth/login/  { username, password }
    Step 1 of login. On success:
      - if settings.DEBUG is True: bypasses OTP, returns tokens immediately (matches existing behavior).
      - otherwise: sends an OTP to the user's email and returns {"otp_required": true, "user_id": ...}
        without issuing tokens yet — tokens are only issued after /api/auth/verify-otp/.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        user = authenticate(request, username=username, password=password)

        if user is None:
            from api.models import User
            existing_user = User.objects.filter(username=username).first()
            lockout = record_failed_attempt(existing_user, request, reason=LoginAttemptStatus.FAILED_PASSWORD)
            log_audit_event(AuditEventType.FAILED_LOGIN, user=existing_user, request=request,
                             description="Failed login — incorrect password.")
            return Response({"success": False, "errors": {"detail": "Invalid username or password."}}, status=status.HTTP_401_UNAUTHORIZED)

        lockout = AccountLockout.objects.filter(user=user).first()
        if lockout and lockout.is_locked:
            log_audit_event(AuditEventType.FAILED_LOGIN, user=user, request=request,
                             description="Login blocked — account locked.")
            return Response(
                {"success": False, "errors": {"detail": "This account is locked due to repeated failed login attempts. Contact your administrator."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        reset_lockout(user)

        if settings.DEBUG:
            refresh = RefreshToken.for_user(user)
            session = start_session(user, request, refresh_jti=str(refresh["jti"]))
            return Response({
                "success": True,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            })

        create_and_send_otp(user, request)
        return Response({"success": True, "otp_required": True, "user_id": str(user.id)})


class VerifyOTPView(APIView):
    """POST /api/auth/verify-otp/  { user_id, code } — Step 2 of login. Issues tokens on success."""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from api.models import User

        user_id = request.data.get("user_id")
        code = request.data.get("code", "")

        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"success": False, "errors": {"detail": "Invalid session — please log in again."}}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_otp(user, code):
            record_failed_attempt(user, request, reason=LoginAttemptStatus.FAILED_OTP)
            log_audit_event(AuditEventType.FAILED_LOGIN, user=user, request=request,
                             description="Failed login — incorrect or expired OTP.")
            return Response({"success": False, "errors": {"detail": "Invalid or expired code."}}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        start_session(user, request, refresh_jti=str(refresh["jti"]))

        return Response({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })


class ResendOTPView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from api.models import User
        user = User.objects.filter(pk=request.data.get("user_id")).first()
        if not user:
            return Response({"success": False, "errors": {"detail": "Invalid session."}}, status=status.HTTP_400_BAD_REQUEST)
        create_and_send_otp(user, request)
        return Response({"success": True, "detail": "A new code has been sent."})


class LogoutView(APIView):
    def post(self, request):
        from security.models import UserSession
        from security.services import end_session

        refresh_token = request.data.get("refresh")
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            pass

        session = UserSession.objects.filter(user=request.user, is_active=True).order_by("-login_at").first()
        if session:
            end_session(session, request=request)

        return Response({"success": True})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Self-service password change — requires the caller's own current password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated."})


# ---------------------------------------------------------------------------
# Accounts / Users (Super Admin manages staff)
# ---------------------------------------------------------------------------
class UserViewSet(BaseModelViewSet):
    """
    Locked to Super Admin only — listing, creating, editing, and deleting
    staff accounts (and resetting their passwords) is an administrative
    action, not something every authenticated staff member should be able
    to do.
    """
    permission_classes = [WithinUserLimit]
    queryset = User.objects.all().order_by("first_name")
    filterset_fields = ["role", "department", "is_active_staff"]
    search_fields = ["username", "first_name", "last_name", "email", "phone"]
    ordering_fields = ["first_name", "date_joined"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Admin-initiated password reset — no old password required. IT Support or Super Admin only."""
        user = self.get_object()
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data["new_password"])
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at"])

        log_audit_event(
            AuditEventType.PASSWORD_CHANGE, user=user, actor=request.user, request=request,
            description=f"Password reset by {request.user.get_full_name()} ({request.user.role}).",
        )
        return Response({"success": True, "detail": f"Password reset for {user.username}."})

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Activate/deactivate a staff account — the technical mechanics of account management."""
        user = self.get_object()
        user.is_active_staff = not user.is_active_staff
        user.save(update_fields=["is_active_staff"])
        log_audit_event(
            AuditEventType.ROLE_CHANGE, user=user, actor=request.user, request=request,
            description=f"Account {'activated' if user.is_active_staff else 'deactivated'} by {request.user.get_full_name()}.",
        )
        return Response({"success": True, "is_active_staff": user.is_active_staff})


# ---------------------------------------------------------------------------
# Departments (lookup table)
# ---------------------------------------------------------------------------
class DepartmentViewSet(BaseModelViewSet):
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    search_fields = ["name"]

    def get_permissions(self):
        # Department lookup (list/retrieve) feeds many dropdowns across the
        # app and stays open, matching existing behavior. But create/update/
        # delete — including assigning a Head of Department, which affects
        # who can approve that department's requisitions — is an
        # administrative action and must require auth. The old
        # `permission_classes = []` disabled auth for ALL actions, not just
        # reads; this scopes it back down.
        if self.action in ("list", "retrieve"):
            return []
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------
class PatientViewSet(BaseModelViewSet):
    queryset = Patient.objects.all().order_by("-created_at")
    serializer_class = PatientSerializer
    filterset_class = PatientFilter
    search_fields = ["full_name", "phone", "national_id", "hospital_number"]
    ordering_fields = ["full_name", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        """
        Duplicate-check search used before registering a new patient.
        Matches on phone, national_id, or hospital_number.
        """
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Provide a search query (?q=)."}, status=status.HTTP_400_BAD_REQUEST)

        matches = Patient.objects.filter(
            Q(phone__icontains=query) | Q(national_id__iexact=query) | Q(hospital_number__iexact=query)
        )
        if matches.exists():
            return Response({
                "found": True,
                "message": "Patient Found",
                "patients": PatientSearchResultSerializer(matches, many=True).data,
            })
        return Response({"found": False, "message": "No matching patient. You may register a new one."})

    @action(detail=True, methods=["get"], url_path="visits")
    def visits(self, request, pk=None):
        patient = self.get_object()
        visits = patient.visits.all().order_by("-visit_date")
        return Response(VisitSerializer(visits, many=True).data)

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        """Full clinical snapshot shown on the doctor's consultation screen."""
        patient = self.get_object()
        return Response({
            "patient": PatientSerializer(patient).data,
            "previous_visits": VisitSerializer(patient.visits.exclude(status=VisitStatus.REGISTERED)[:10], many=True).data,
            "allergies": AllergySerializer(patient.allergies.all(), many=True).data,
            "medical_history": MedicalHistoryNoteSerializer(patient.medical_history.all(), many=True).data,
            "current_medications": PrescriptionSerializer(
                Prescription.objects.filter(consultation__visit__patient=patient, is_dispensed=False).order_by("-created_at"),
                many=True,
            ).data,
        })


class AllergyViewSet(BaseModelViewSet):
    queryset = Allergy.objects.all()
    serializer_class = AllergySerializer
    filterset_fields = ["patient"]


class MedicalHistoryNoteViewSet(BaseModelViewSet):
    queryset = MedicalHistoryNote.objects.all()
    serializer_class = MedicalHistoryNoteSerializer
    filterset_fields = ["patient"]


# ---------------------------------------------------------------------------
# Visits
# ---------------------------------------------------------------------------
class VisitViewSet(BaseModelViewSet):
    queryset = Visit.objects.select_related("patient", "department", "doctor").all().order_by("-visit_date")
    serializer_class = VisitSerializer
    filterset_class = VisitFilter
    search_fields = ["visit_number", "patient__full_name", "patient__hospital_number"]
    ordering_fields = ["visit_date"]
    
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        visit = serializer.save(registered_by=self.request.user, status=VisitStatus.AWAITING_PAYMENT)
        return visit
    
    def perform_destroy(self, instance):
        # Soft-delete via BaseModel's existing pattern, not a hard delete —
        # matches every other module's destroy behavior in this system.
        instance.soft_delete()


# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------
from decimal import Decimal
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Coalesce


class InvoiceViewSet(BaseModelViewSet):
    queryset = Invoice.objects.select_related("patient", "visit").all()
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    search_fields = ["invoice_number", "patient__full_name"]
    http_method_names = ["get", "post", "head", "options"]  # invoices are system-generated, not hand-edited

    @action(detail=False, methods=["get"])
    def summary(self, request):
        # Same filtering/search DRF already applies to the list endpoint —
        # so stats always match whatever search/status filter is active,
        # aggregated over ALL matching rows, not just the current page.
        queryset = self.filter_queryset(self.get_queryset())
        zero = Decimal("0.00")

        aggregates = queryset.aggregate(
            total_invoices=Count("id"),
            total_amount=Coalesce(Sum("amount"), zero),
            total_paid=Coalesce(Sum("amount_paid"), zero),
            total_outstanding=Coalesce(Sum(F("amount") - F("amount_paid")), zero),
            unpaid_count=Count("id", filter=Q(status="UNPAID")),
            partial_count=Count("id", filter=Q(status="PARTIAL")),
            paid_count=Count("id", filter=Q(status="PAID")),
            cancelled_count=Count("id", filter=Q(status="CANCELLED")),
        )
        return Response(aggregates)

class PaymentViewSet(BaseModelViewSet):
    permission_classes = [IsCashierOrAccountant, RequiresOpenTill]
    queryset = Payment.objects.select_related("invoice", "cashier").all()
    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    search_fields = ["receipt_number", "invoice__invoice_number", "invoice__patient__full_name"]
    http_method_names = ["get", "post", "head", "options"]  # payments are immutable once made

    def perform_create(self, serializer):
        payment = serializer.save(cashier=self.request.user)

        # Generate a printable QR code encoding the receipt number + amount,
        # for verification at pickup / audit time.
        qr_payload = f"RECEIPT:{payment.receipt_number}|AMOUNT:{payment.amount}|INVOICE:{payment.invoice.invoice_number}"
        payment.qr_code = generate_qr_code(qr_payload, f"receipt_{payment.receipt_number}")
        payment.save(update_fields=["qr_code"])

        from notifications.services import notify
        from notifications.models import NotificationType, NotificationCategory

        notify(
            payment.cashier,
            NotificationType.PAYMENT_RECEIVED,
            f"Payment received: KES {payment.amount}",
            f"Receipt {payment.receipt_number} for {payment.invoice.patient.full_name}",
            link="/billing/payments",
            category=NotificationCategory.BILLING,
        )

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        """Structured receipt payload for the frontend to render/print."""
        payment = self.get_object()
        invoice = payment.invoice
        qr_code_url = None
        if payment.qr_code:
            qr_code_url = request.build_absolute_uri(payment.qr_code.url)

        return Response({
            "hospital_name": "City General Hospital",
            "receipt_number": payment.receipt_number,
            "patient_name": invoice.patient.full_name,
            "visit_number": invoice.visit.visit_number if invoice.visit else None,
            "cashier": payment.cashier.get_full_name() if payment.cashier else None,
            "payment_method": payment.method,
            "amount_paid": str(payment.amount),
            "invoice_balance": str(invoice.balance),
            "qr_code_url": qr_code_url,
            "paid_at": payment.paid_at,
        })


# ---------------------------------------------------------------------------
# Queue Management
# ---------------------------------------------------------------------------
class QueueEntryViewSet(BaseModelViewSet):
    queryset = QueueEntry.objects.select_related("patient", "visit", "assigned_to").exclude(
        status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]
    )
    serializer_class = QueueEntrySerializer
    filterset_class = QueueEntryFilter
    search_fields = ["patient__full_name", "patient__hospital_number"]

    @action(detail=True, methods=["post"], url_path="call-next")
    def call_next(self, request, pk=None):
        entry = self.get_object()
        entry.status = QueueStatus.WITH_NURSE if entry.queue_type == QueueType.NURSE else QueueStatus.CONSULTING
        entry.assigned_to = request.user
        entry.called_at = timezone.now()
        entry.save()
        return Response(QueueEntrySerializer(entry).data)

    @action(detail=False, methods=["get"], url_path="my-queue")
    def my_queue(self, request):
        """Doctor/Nurse dashboard: entries assigned to me or waiting in my queue type."""
        queue_type = request.query_params.get("queue_type", QueueType.DOCTOR if request.user.role == Role.DOCTOR else QueueType.NURSE)
        entries = self.get_queryset().filter(queue_type=queue_type).order_by("-priority", "created_at")
        return Response(QueueEntrySerializer(entries, many=True).data)


# ---------------------------------------------------------------------------
# Triage / Vitals
# ---------------------------------------------------------------------------
class VitalSignsViewSet(BaseModelViewSet):
    queryset = VitalSigns.objects.select_related("visit").all()
    serializer_class = VitalSignsSerializer
    filterset_fields = ["visit"]

    def perform_create(self, serializer):
        vitals = serializer.save(recorded_by=self.request.user)
        # Move patient from Nurse queue -> Waiting Doctor, and open the doctor queue.
        QueueEntry.objects.filter(visit=vitals.visit, queue_type=QueueType.NURSE).update(
            status=QueueStatus.COMPLETED, completed_at=timezone.now()
        )
        QueueEntry.objects.get_or_create(
            visit=vitals.visit, queue_type=QueueType.DOCTOR,
            defaults={"patient": vitals.visit.patient, "status": QueueStatus.WAITING_DOCTOR},
        )
        vitals.visit.status = VisitStatus.IN_QUEUE
        vitals.visit.save(update_fields=["status"])


# ---------------------------------------------------------------------------
# ICD-10
# ---------------------------------------------------------------------------
class ICD10CodeViewSet(BaseModelViewSet):
    queryset = ICD10Code.objects.all()
    serializer_class = ICD10CodeSerializer
    permission_classes = []
    search_fields = ["code", "description"]
    lookup_field = "code"
    filterset_fields = []  # add ["category"] here if that field exists on your model

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        """Autocomplete: search by code or description. e.g. ?q=A09"""
        query = request.query_params.get("q", "").strip()
        results = ICD10Code.objects.filter(Q(code__istartswith=query) | Q(description__icontains=query))[:20]
        return Response(ICD10CodeSerializer(results, many=True).data)
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Supports ?search= for code/description matching, handled by
        # search_fields above via your existing SearchFilter backend.
        return qs


# ---------------------------------------------------------------------------
# Consultation
# ---------------------------------------------------------------------------
class ConsultationViewSet(BaseModelViewSet):
    queryset = Consultation.objects.select_related("visit__patient", "doctor").order_by("-started_at")
    serializer_class = ConsultationSerializer
    filterset_fields = ["status", "doctor", "visit"]
    search_fields = ["visit__patient__full_name", "visit__visit_number"]

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        existing = Consultation.objects.filter(visit=visit).first()
        if existing:
            serializer.instance = existing
            return

        consultation = serializer.save(doctor=self.request.user)
        consultation.visit.status = VisitStatus.IN_CONSULTATION
        consultation.visit.save(update_fields=["status"])
        QueueEntry.objects.filter(visit=consultation.visit, queue_type=QueueType.DOCTOR).update(
            status=QueueStatus.CONSULTING, assigned_to=self.request.user
        )

    @action(detail=True, methods=["post"], url_path="add-diagnosis")
    def add_diagnosis(self, request, pk=None):
        consultation = self.get_object()
        icd10_code = request.data.get("icd10_code")
        is_primary = request.data.get("is_primary", False)
        notes = request.data.get("notes", "")
        try:
            code_obj = ICD10Code.objects.get(code=icd10_code)
        except ICD10Code.DoesNotExist:
            return Response({"detail": "Unknown ICD-10 code."}, status=status.HTTP_404_NOT_FOUND)
        diagnosis, _ = ConsultationDiagnosis.objects.update_or_create(
            consultation=consultation, icd10_code=code_obj,
            defaults={"is_primary": is_primary, "notes": notes},
        )
        return Response(ConsultationDiagnosisSerializer(diagnosis).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        consultation = self.get_object()
        serializer = ConsultationPauseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consultation.status = ConsultationStatus.PAUSED
        consultation.pause_reason = serializer.validated_data["pause_reason"]
        consultation.pause_notes = serializer.validated_data.get("pause_notes", "")
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        consultation = self.get_object()
        consultation.status = ConsultationStatus.IN_PROGRESS
        consultation.pause_reason = ""
        consultation.pause_notes = ""
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        consultation = self.get_object()
        consultation.status = ConsultationStatus.COMPLETED
        consultation.completed_at = timezone.now()
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"], url_path="add-procedure")
    def add_procedure(self, request, pk=None):
        """Records a procedure performed during this consultation and bills it immediately against the visit."""
        consultation = self.get_object()
        serializer = AddConsultationProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            invoice = Invoice.objects.create(
                patient=consultation.visit.patient,
                visit=consultation.visit,
                source_type=InvoiceSourceType.PROCEDURE,
                description=f"Procedure - {data['description']} ({consultation.visit.visit_number})",
                amount=data["amount"],
            )
            procedure = ConsultationProcedure.objects.create(
                consultation=consultation, description=data["description"],
                amount=data["amount"], performed_by=request.user, invoice=invoice,
            )

        return Response(ConsultationProcedureSerializer(procedure).data, status=status.HTTP_201_CREATED)


class PrescriptionViewSet(BaseModelViewSet):
    queryset = Prescription.objects.select_related("medicine", "consultation").all()
    serializer_class = PrescriptionSerializer
    filterset_fields = ["consultation", "is_dispensed"]
    search_fields = ["medicine__name"]


# ---------------------------------------------------------------------------
# Laboratory
# ---------------------------------------------------------------------------
class LabTestCatalogViewSet(BaseModelViewSet):
    queryset = LabTestCatalog.objects.filter(is_active=True)
    serializer_class = LabTestCatalogSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    search_fields = ["name", "code"]


class LabOrderViewSet(BaseModelViewSet):
    queryset = LabOrder.objects.select_related("test", "consultation__visit__patient").all()
    serializer_class = LabOrderSerializer
    filterset_class = LabOrderFilter
    search_fields = ["consultation__visit__patient__full_name", "test__name"]

    def perform_create(self, serializer):
        order = serializer.save(ordered_by=self.request.user)
        invoice = Invoice.objects.create(
            patient=order.consultation.visit.patient,
            visit=order.consultation.visit,
            source_type=InvoiceSourceType.LAB,
            description=f"Lab Test - {order.test.name}",
            amount=order.test.price,
        )
        order.invoice = invoice
        order.save(update_fields=["invoice"])

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """Lab dashboard: orders awaiting collection/processing."""
        orders = self.get_queryset().exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED])
        return Response(LabOrderSerializer(orders, many=True).data)

    @action(detail=True, methods=["post"], url_path="collect")
    def collect(self, request, pk=None):
        order = self.get_object()
        if not order.is_paid:
            return Response({"detail": "Payment Required"}, status=status.HTTP_402_PAYMENT_REQUIRED)
        order.status = LabOrderStatus.COLLECTED
        order.save(update_fields=["status"])
        return Response(LabOrderSerializer(order).data)


class LabResultViewSet(BaseModelViewSet):
    queryset = LabResult.objects.select_related("lab_order").all()
    serializer_class = LabResultSerializer
    filterset_fields = ["lab_order"]

    def perform_create(self, serializer):
        order = serializer.validated_data["lab_order"]

        if not order.is_paid:
            raise PermissionDeniedPaymentRequired()

        result = serializer.save(
            technologist=self.request.user,
            completed_at=timezone.now()
        )

        order.status = LabOrderStatus.COMPLETED
        order.save(update_fields=["status"])

        from notifications.services import notify
        from notifications.models import (
            NotificationType,
            NotificationCategory,
            NotificationPriority,
        )

        notify(
            order.ordered_by,
            NotificationType.LAB_RESULTS_READY,
            f"Lab results ready: {order.test.name}",
            f"For patient {order.consultation.visit.patient.full_name}",
            link="/laboratory",
            category=NotificationCategory.CLINICAL,
            priority=NotificationPriority.HIGH,
        )


# Small helper exception so LabResultViewSet.perform_create can short-circuit with 402.
from rest_framework.exceptions import APIException


class PermissionDeniedPaymentRequired(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Payment Required. Cannot proceed until the lab order is paid."
    default_code = "payment_required"


# ---------------------------------------------------------------------------
# Radiology
# ---------------------------------------------------------------------------
class RadiologyTestCatalogViewSet(BaseModelViewSet):
    queryset = RadiologyTestCatalog.objects.filter(is_active=True)
    serializer_class = RadiologyTestCatalogSerializer
    permission_classes = []
    search_fields = ["name", "code"]


class RadiologyOrderViewSet(BaseModelViewSet):
    queryset = RadiologyOrder.objects.select_related("test", "consultation__visit__patient").all()
    serializer_class = RadiologyOrderSerializer
    filterset_class = RadiologyOrderFilter
    search_fields = ["consultation__visit__patient__full_name", "test__name"]

    def perform_create(self, serializer):
        order = serializer.save(ordered_by=self.request.user)
        invoice = Invoice.objects.create(
            patient=order.consultation.visit.patient,
            visit=order.consultation.visit,
            source_type=InvoiceSourceType.RADIOLOGY,
            description=f"Radiology - {order.test.name}",
            amount=order.test.price,
        )
        order.invoice = invoice
        order.save(update_fields=["invoice"])

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        orders = self.get_queryset().exclude(status__in=[RadiologyOrderStatus.REPORTED, RadiologyOrderStatus.CANCELLED])
        return Response(RadiologyOrderSerializer(orders, many=True).data)


class RadiologyResultViewSet(BaseModelViewSet):
    queryset = RadiologyResult.objects.select_related("radiology_order").all()
    serializer_class = RadiologyResultSerializer
    filterset_fields = ["radiology_order"]

    def perform_create(self, serializer):
        order = serializer.validated_data["radiology_order"]
        if not order.is_paid:
            raise PermissionDeniedPaymentRequired()
        result = serializer.save(radiologist=self.request.user, completed_at=timezone.now())
        order.status = RadiologyOrderStatus.REPORTED
        order.save(update_fields=["status"])


# ---------------------------------------------------------------------------
# Pharmacy / Inventory
# ---------------------------------------------------------------------------
class SupplierViewSet(BaseModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ["name", "phone", "email"]


class MedicineViewSet(BaseModelViewSet):
    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    filterset_class = MedicineFilter
    search_fields = ["name", "generic_name", "category"]

    @action(detail=False, methods=["get"], url_path="autocomplete")
    def autocomplete(self, request):
        query = request.query_params.get("q", "").strip()
        results = Medicine.objects.filter(Q(name__icontains=query) | Q(generic_name__icontains=query))[:20]
        return Response(MedicineSerializer(results, many=True).data)

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        low = [m for m in Medicine.objects.all() if m.is_low_stock]
        return Response(MedicineSerializer(low, many=True).data)


class MedicineBatchViewSet(BaseModelViewSet):
    queryset = MedicineBatch.objects.select_related("medicine", "supplier").all()
    serializer_class = MedicineBatchSerializer
    filterset_class = MedicineBatchFilter
    search_fields = ["medicine__name", "batch_number"]

    def perform_create(self, serializer):
        batch = serializer.save(quantity_remaining=serializer.validated_data["quantity_received"])
        StockTransaction.objects.create(
            medicine=batch.medicine, batch=batch, transaction_type=StockTransactionType.STOCK_IN,
            quantity=batch.quantity_received, reason="New batch received",
            performed_by=self.request.user,
        )

    def perform_update(self, serializer):
        # A manual edit (correcting a data-entry error, writing off damaged
        # stock, etc.) can change quantity_remaining directly — without this,
        # that change would never show up in the StockTransaction audit
        # trail the rest of the app relies on for "why did stock move".
        old_quantity = serializer.instance.quantity_remaining
        batch = serializer.save()
        delta = batch.quantity_remaining - old_quantity
        if delta != 0:
            StockTransaction.objects.create(
                medicine=batch.medicine, batch=batch,
                transaction_type=StockTransactionType.ADJUSTMENT,
                quantity=delta,
                reason=f"Manual stock update by {self.request.user.get_full_name() or self.request.user.username}",
                performed_by=self.request.user,
            )

    @action(detail=False, methods=["get"], url_path="expiring-soon")
    def expiring_soon(self, request):
        cutoff = date.today() + timedelta(days=30)
        qs = self.get_queryset().filter(
            expiry_date__lte=cutoff,
            expiry_date__gte=date.today(),
            quantity_remaining__gt=0,
        ).order_by("expiry_date")
        return Response(self.get_serializer(qs, many=True).data)
    
    
class StockTransactionViewSet(BaseModelViewSet):
    queryset = StockTransaction.objects.select_related("medicine", "batch").all()
    serializer_class = StockTransactionSerializer
    filterset_fields = ["medicine", "transaction_type"]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)


from django.db import transaction
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status


class PharmacyDispenseViewSet(BaseModelViewSet):
    queryset = PharmacyDispense.objects.select_related("prescription__medicine", "invoice", "batch").all()
    serializer_class = PharmacyDispenseSerializer
    filterset_fields = ["status", "payment_method"]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        """
        Stage 1 — Prepare. Records intent to dispense and raises the invoice
        at the price matching the chosen payment method. Does NOT touch
        stock — that only happens once the invoice is confirmed fully paid,
        via the `complete` action below.
        """
        serializer = PrepareDispenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        prescription = Prescription.objects.select_related("medicine", "consultation__visit__patient").filter(
            pk=data["prescription"]
        ).first()
        if not prescription:
            raise ValidationError({"prescription": "Prescription not found."})

        medicine = prescription.medicine
        quantity = data["quantity_dispensed"]
        payment_method = data["payment_method"]
        unit_price = medicine.price_for_method(payment_method)

        with transaction.atomic():
            patient = prescription.consultation.visit.patient
            visit = prescription.consultation.visit
            invoice = Invoice.objects.create(
                patient=patient, visit=visit,
                source_type=InvoiceSourceType.PHARMACY,
                description=f"{medicine.name} x{quantity} ({payment_method})",
                amount=unit_price * quantity,
            )
            dispense = PharmacyDispense.objects.create(
                prescription=prescription, quantity_dispensed=quantity,
                payment_method=payment_method, status="PENDING_PAYMENT",
                invoice=invoice, dispensed_by=request.user,
            )

        return Response(PharmacyDispenseSerializer(dispense).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        """
        Stage 2 — Complete. Only allowed once the linked invoice shows
        status=PAID (checked here server-side — never trust the frontend
        on this). This is the moment stock actually moves: FEFO batch
        selection, quantity_remaining deduction, StockTransaction log —
        exactly the same mechanism your other modules already use.
        """
        dispense = self.get_object()
        if dispense.status != "PENDING_PAYMENT":
            raise ValidationError({"detail": "This dispense is not awaiting completion."})
        if not dispense.invoice or dispense.invoice.status != "PAID":
            raise ValidationError({"detail": "Invoice must be fully paid before completing this dispense."})

        medicine = dispense.prescription.medicine
        quantity = dispense.quantity_dispensed

        batch = (
            MedicineBatch.objects.filter(medicine=medicine, quantity_remaining__gte=quantity)
            .order_by("expiry_date").first()
        )
        if not batch:
            raise OutOfStockError(f"{medicine.name} is out of stock.")

        with transaction.atomic():
            batch.quantity_remaining -= quantity
            batch.save(update_fields=["quantity_remaining"])

            StockTransaction.objects.create(
                medicine=medicine, batch=batch, transaction_type=StockTransactionType.STOCK_OUT,
                quantity=quantity, reason=f"Pharmacy dispense - {dispense.prescription.id}",
                performed_by=request.user,
            )

            dispense.batch = batch
            dispense.status = "COMPLETED"
            dispense.completed_by = request.user
            dispense.completed_at = timezone.now()
            dispense.save(update_fields=["batch", "status", "completed_by", "completed_at"])

            dispense.prescription.is_dispensed = True
            dispense.prescription.save(update_fields=["is_dispensed"])

        return Response(PharmacyDispenseSerializer(dispense).data)

    @action(detail=False, methods=["get"], url_path="pending-completion")
    def pending_completion(self, request):
        """Dispenses whose invoice is now PAID and are ready for stock deduction — the pharmacist's worklist."""
        qs = self.get_queryset().filter(status="PENDING_PAYMENT", invoice__status="PAID")
        return Response(PharmacyDispenseSerializer(qs, many=True).data)


class OutOfStockError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Out of Stock. Cannot dispense this medicine."
    default_code = "out_of_stock"


# ---------------------------------------------------------------------------
# Walk-in / OTC Pharmacy Sales (POS)
# ---------------------------------------------------------------------------
class OTCSaleViewSet(BaseModelViewSet):
    """
    Direct, patient-free medicine sales — a retail POS transaction rather
    than a clinical workflow. Sales are immutable once made (no PATCH/PUT),
    matching the PaymentViewSet/InvoiceViewSet convention elsewhere.
    """
    permission_classes = [IsCashierOrAccountant, RequiresOpenTill]
    queryset = OTCSale.objects.prefetch_related("items__medicine").select_related("served_by").all()
    serializer_class = OTCSaleSerializer
    search_fields = ["sale_number", "customer_name", "customer_phone"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return OTCSaleCreateSerializer
        return OTCSaleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            sale = OTCSale.objects.create(
                customer_name=data.get("customer_name", ""),
                customer_phone=data.get("customer_phone", ""),
                discount=data.get("discount", 0),
                payment_method=data["payment_method"],
                reference_number=data.get("reference_number", ""),
                amount_paid=data["amount_paid"],
                served_by=request.user,
            )

            subtotal = 0
            for item in data["items"]:
                medicine = item["medicine"]
                quantity = item["quantity"]

                # FEFO: earliest-expiring batch with enough stock, same as PharmacyDispenseViewSet.
                batch = (
                    MedicineBatch.objects.filter(medicine=medicine, quantity_remaining__gte=quantity)
                    .order_by("expiry_date").first()
                )
                if not batch:
                    raise OutOfStockError(f"{medicine.name} is out of stock.")

                sale_item = OTCSaleItem.objects.create(
                    sale=sale, medicine=medicine, batch=batch,
                    quantity=quantity, unit_price=medicine.unit_price,
                )
                subtotal += sale_item.subtotal

                batch.quantity_remaining -= quantity
                batch.save(update_fields=["quantity_remaining"])

                StockTransaction.objects.create(
                    medicine=medicine, batch=batch, transaction_type=StockTransactionType.STOCK_OUT,
                    quantity=quantity, reason=f"OTC sale {sale.sale_number}",
                    performed_by=request.user,
                )

            sale.subtotal = subtotal
            sale.total_amount = subtotal - sale.discount
            sale.save(update_fields=["subtotal", "total_amount"])

            qr_payload = f"OTC:{sale.sale_number}|AMOUNT:{sale.total_amount}"
            sale.qr_code = generate_qr_code(qr_payload, f"otc_receipt_{sale.sale_number}")
            sale.save(update_fields=["qr_code"])

        from etims.services import fiscalize_otc_sale
        try:
            fiscalize_otc_sale(sale, user=request.user)
        except Exception:
            pass  # never block the sale on a fiscalization failure; retry via UI

        return Response(
            OTCSaleSerializer(sale, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        """Structured receipt payload for the frontend to render/print — mirrors PaymentViewSet.receipt."""
        sale = self.get_object()
        qr_code_url = request.build_absolute_uri(sale.qr_code.url) if sale.qr_code else None

        return Response({
            "hospital_name": "City General Hospital",
            "sale_number": sale.sale_number,
            "customer_name": sale.customer_name or "Walk-in Customer",
            "customer_phone": sale.customer_phone,
            "served_by": sale.served_by.get_full_name() if sale.served_by else None,
            "items": [
                {
                    "medicine_name": item.medicine.name,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "subtotal": str(item.subtotal),
                }
                for item in sale.items.all()
            ],
            "subtotal": str(sale.subtotal),
            "discount": str(sale.discount),
            "total_amount": str(sale.total_amount),
            "amount_paid": str(sale.amount_paid),
            "balance": str(sale.balance),
            "payment_method": sale.payment_method,
            "reference_number": sale.reference_number,
            "qr_code_url": qr_code_url,
            "sold_at": sale.sold_at,
        })


# ---------------------------------------------------------------------------
# Audit Log (read-only, Super Admin or IsITSupportOrSuperAdmin)
# ---------------------------------------------------------------------------
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    filterset_fields = ["model_name", "action", "user"]
    search_fields = ["object_id", "model_name"]


# ---------------------------------------------------------------------------
# Unified Transactions (read-only, merges Payment + OTCSale)
# ---------------------------------------------------------------------------
class AllTransactionsView(APIView):
    """
    GET /api/transactions/?date_from=&date_to=&source=HOSPITAL|OTC

    Merges hospital billing (Payment) and walk-in pharmacy sales (OTCSale)
    into a single, newest-first feed so "all my money" can be viewed in one
    place. This is purely a read-only aggregation: it does not write to,
    modify, or reroute either model. Payment/Invoice and OTCSale creation
    behave exactly as before — nothing about those flows changes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        source = request.query_params.get("source")

        rows = []

        if source in (None, "", "HOSPITAL"):
            payments = Payment.objects.select_related("invoice__patient", "cashier").all()
            if date_from:
                payments = payments.filter(paid_at__date__gte=date_from)
            if date_to:
                payments = payments.filter(paid_at__date__lte=date_to)
            for p in payments:
                rows.append({
                    "id": p.id,
                    "source": "HOSPITAL",
                    "reference_number": p.receipt_number,
                    "payer_name": p.invoice.patient.full_name,
                    "amount": p.amount,
                    "method": p.method,
                    "served_by": p.cashier.get_full_name() if p.cashier else None,
                    "occurred_at": p.paid_at,
                })

        if source in (None, "", "OTC"):
            sales = OTCSale.objects.select_related("served_by").all()
            if date_from:
                sales = sales.filter(sold_at__date__gte=date_from)
            if date_to:
                sales = sales.filter(sold_at__date__lte=date_to)
            for s in sales:
                rows.append({
                    "id": s.id,
                    "source": "OTC",
                    "reference_number": s.sale_number,
                    "payer_name": s.customer_name or "Walk-in Customer",
                    "amount": s.amount_paid,
                    "method": s.payment_method,
                    "served_by": s.served_by.get_full_name() if s.served_by else None,
                    "occurred_at": s.sold_at,
                })

        rows.sort(key=lambda r: r["occurred_at"], reverse=True)
        return Response(TransactionSerializer(rows, many=True).data)


# ---------------------------------------------------------------------------
# Dashboard & Reports
# ---------------------------------------------------------------------------
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Visit, Payment, OTCSale, QueueEntry, QueueStatus, LabOrder, LabOrderStatus,
    RadiologyOrder, RadiologyOrderStatus, Consultation, Medicine,
    Patient, Invoice, InvoiceStatus, InvoiceSourceType, User, Role,
    ConsultationDiagnosis,
)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        todays_visits = Visit.objects.filter(visit_date__date=today)
        todays_payments = Payment.objects.filter(paid_at__date=today)
        todays_otc = OTCSale.objects.filter(sold_at__date=today)

        # ---------------- Existing cards (unchanged) ----------------
        cards = {
            "todays_patients": todays_visits.values("patient").distinct().count(),
            "waiting_patients": QueueEntry.objects.exclude(
                status__in=[QueueStatus.COMPLETED, QueueStatus.CANCELLED]
            ).count(),
            "todays_revenue": str(
                (todays_payments.aggregate(total=Sum("amount"))["total"] or 0)
                + (todays_otc.aggregate(total=Sum("amount_paid"))["total"] or 0)
            ),
            "pending_lab": LabOrder.objects.exclude(
                status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED]
            ).count(),
            "pending_radiology": RadiologyOrder.objects.exclude(
                status__in=[RadiologyOrderStatus.REPORTED, RadiologyOrderStatus.CANCELLED]
            ).count(),
            "todays_consultations": Consultation.objects.filter(started_at__date=today).count(),
            "medicine_stock_alerts": len([m for m in Medicine.objects.all() if m.is_low_stock]),
        }

        # ---------------- Total revenue generated (all-time) ----------------
        all_time_hospital_revenue = Payment.objects.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        all_time_otc_revenue = OTCSale.objects.aggregate(t=Sum("amount_paid"))["t"] or Decimal("0")
        cards["total_revenue_all_time"] = str(all_time_hospital_revenue + all_time_otc_revenue)

        # ---------------- Patients by gender ----------------
        # Assumes Patient has a `gender` field with values like "MALE"/"FEMALE"
        # — adjust the exact choice strings below if your Patient model uses
        # different values (e.g. "M"/"F").
        cards["total_patients"] = Patient.objects.count()
        cards["male_patients"] = Patient.objects.filter(gender__iexact="MALE").count()
        cards["female_patients"] = Patient.objects.filter(gender__iexact="FEMALE").count()

        # ---------------- Invoices: total, paid, unpaid, unpaid amount ----------------
        all_invoices = Invoice.objects.exclude(status=InvoiceStatus.CANCELLED)
        paid_invoices = all_invoices.filter(status=InvoiceStatus.PAID)
        unpaid_invoices = all_invoices.exclude(status=InvoiceStatus.PAID)
        cards["total_invoices"] = all_invoices.count()
        cards["paid_invoices"] = paid_invoices.count()
        cards["unpaid_invoices"] = unpaid_invoices.count()
        cards["unpaid_amount"] = str(
            sum((inv.balance for inv in unpaid_invoices), start=Decimal("0"))
        )

        # ---------------- Doctor / Nurse counts ----------------
        cards["total_doctors"] = User.objects.filter(role=Role.DOCTOR, is_active_staff=True).count()
        cards["total_nurses"] = User.objects.filter(role=Role.NURSE, is_active_staff=True).count()

        # ---------------- Beds: total / occupied ----------------
        # inpatient.Bed confirmed to exist (Bed.objects.count() already
        # verified working via the licensing module). Occupied-status field
        # name is not yet confirmed, so this tries the most common
        # conventions and falls back to None (not a guessed number) if none match.
        total_beds, occupied_beds = self._get_bed_counts()
        cards["total_beds"] = total_beds
        cards["occupied_beds"] = occupied_beds

        # ---------------- Revenue by service/source type ----------------
        # Which service generates the most money — Emergency, OTC, IP, Lab,
        # Radiology, Pharmacy, Consultation, Procedure, etc. Grouped over
        # the invoice's own source_type, using actual amount_paid (real
        # money collected, not just billed).
        revenue_by_source = list(
            Invoice.objects.exclude(status=InvoiceStatus.CANCELLED)
            .values("source_type")
            .annotate(total=Sum("amount_paid"))
            .order_by("-total")
        )
        otc_total_paid = OTCSale.objects.aggregate(t=Sum("amount_paid"))["t"] or Decimal("0")
        revenue_by_service = [
            {"name": r["source_type"], "value": float(r["total"] or 0)} for r in revenue_by_source
        ]
        revenue_by_service.append({"name": "OTC_PHARMACY", "value": float(otc_total_paid)})
        revenue_by_service.sort(key=lambda x: x["value"], reverse=True)
        top_revenue_service = revenue_by_service[0] if revenue_by_service else None

        # ---------------- Most reported/diagnosed case ----------------
        top_diagnoses = list(
            ConsultationDiagnosis.objects.exclude(icd10_code__isnull=True)
            .values("icd10_code__code", "icd10_code__description")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        most_reported_case = (
            {
                "code": top_diagnoses[0]["icd10_code__code"],
                "description": top_diagnoses[0]["icd10_code__description"],
                "count": top_diagnoses[0]["count"],
            }
            if top_diagnoses
            else None
        )

        # ---------------- Revenue — last 12 months ----------------
        month_starts = []
        year, month = today.year, today.month
        for _ in range(12):
            month_starts.append(date(year, month, 1))
            month -= 1
            if month == 0:
                month = 12
                year -= 1
        month_starts.reverse()

        monthly_revenue = []
        for idx, start in enumerate(month_starts):
            if idx + 1 < len(month_starts):
                end = month_starts[idx + 1] - timedelta(days=1)
            else:
                end = today
            hospital_total = Payment.objects.filter(
                paid_at__date__gte=start, paid_at__date__lte=end
            ).aggregate(t=Sum("amount"))["t"] or Decimal("0")
            otc_total = OTCSale.objects.filter(
                sold_at__date__gte=start, sold_at__date__lte=end
            ).aggregate(t=Sum("amount_paid"))["t"] or Decimal("0")
            monthly_revenue.append({"name": start.strftime("%b %Y"), "value": float(hospital_total + otc_total)})

        # ---------------- Existing 7-day charts (unchanged) ----------------
        last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        revenue_chart = []
        for d in last_7_days:
            hospital_total = Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0
            otc_total = OTCSale.objects.filter(sold_at__date=d).aggregate(t=Sum("amount_paid"))["t"] or 0
            revenue_chart.append({"date": d.isoformat(), "revenue": str(hospital_total + otc_total)})

        visits_chart = [
            {"date": d.isoformat(), "visits": Visit.objects.filter(visit_date__date=d).count()}
            for d in last_7_days
        ]
        department_chart = list(
            Visit.objects.filter(visit_date__date__gte=today - timedelta(days=30))
            .values("department__name").annotate(count=Count("id")).order_by("-count")
        )

        return Response({
            "cards": cards,
            "top_revenue_service": top_revenue_service,
            "most_reported_case": most_reported_case,
            "charts": {
                "revenue": revenue_chart,
                "visits": visits_chart,
                "departments": department_chart,
                "revenue_by_service": revenue_by_service,
                "top_diagnoses": [
                    {"name": f"{d['icd10_code__code']} - {d['icd10_code__description']}", "value": d["count"]}
                    for d in top_diagnoses
                ],
                "monthly_revenue_12m": monthly_revenue,
            },
        })

    def _get_bed_counts(self):
        """
        Returns (total_beds, occupied_beds). Tries common status field
        conventions since the exact Bed model schema hasn't been confirmed
        in this conversation. Returns (count, None) for occupied if no
        recognized status field is found — never guesses a wrong number.
        """
        try:
            from inpatient.models import Bed
        except (ImportError, ModuleNotFoundError):
            return None, None

        try:
            total = Bed.objects.count()
        except Exception:
            return None, None

        occupied = None
        # Try the most likely status field/value conventions in order.
        for field_name, occupied_value in [
            ("status", "OCCUPIED"),
            ("bed_status", "OCCUPIED"),
            ("status", "IN_USE"),
        ]:
            try:
                occupied = Bed.objects.filter(**{f"{field_name}__iexact": occupied_value}).count()
                break
            except Exception:
                continue

        if occupied is None:
            # Fall back to a boolean-style field if present.
            for field_name in ["is_occupied", "occupied"]:
                try:
                    occupied = Bed.objects.filter(**{field_name: True}).count()
                    break
                except Exception:
                    continue

        return total, occupied
    
# ---------------------------------------------------------------------
# Module-level helpers — moved OUT of ReportsView.get() so they no
# longer sit between `elif` branches (that was the syntax error: a
# `def`/assignment statement in the middle of an if/elif chain breaks
# the chain, so the next `elif` has no matching `if`).
# ---------------------------------------------------------------------

_AGE_GROUP_ORDER = [
    "Children (0-12)", "Teenagers (13-19)", "Youth (20-35)",
    "Adults (36-59)", "Seniors (60+)", "Unknown",
]
_GENDER_LABELS = {"MALE": "Male", "FEMALE": "Female", "OTHER": "Other"}


def _age_group(age):
    """Buckets a Patient.age (int or None) into the standard reporting bands."""
    if age is None:
        return "Unknown"
    if age < 13:
        return "Children (0-12)"
    if age < 20:
        return "Teenagers (13-19)"
    if age < 36:
        return "Youth (20-35)"
    if age < 60:
        return "Adults (36-59)"
    return "Seniors (60+)"


def _last_12_months(end):
    """Returns [(year, month), ...] for the 12 calendar months ending at `end`, oldest first."""
    months = []
    y, m = end.year, end.month
    for i in range(11, -1, -1):
        mm = m - i
        yy = y
        while mm <= 0:
            mm += 12
            yy -= 1
        months.append((yy, mm))
    return months


class ReportsView(APIView):
    """
    GET /api/reports/?type=daily_revenue|doctor_revenue|department_revenue|patient_statistics
                        |medicine_sales|lab_revenue|radiology_revenue|consultation_revenue|otc_sales
                        |inpatient_revenue|opd_daily|ipd_report|mch_report|revenue_report
                        |drug_consumption|disease_statistics
        &date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get("type", "daily_revenue")
        date_from = request.query_params.get("date_from") or str(date.today() - timedelta(days=30))
        date_to = request.query_params.get("date_to") or str(date.today())

        payments = Payment.objects.filter(paid_at__date__gte=date_from, paid_at__date__lte=date_to)
        invoices = Invoice.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)

        # -------------------------------------------------------------
        # Legacy simple reports (unchanged)
        # -------------------------------------------------------------
        if report_type == "daily_revenue":
            hospital_by_day = {
                row["paid_at__date"]: row["total"] or 0
                for row in payments.values("paid_at__date").annotate(total=Sum("amount"))
            }
            otc_qs = OTCSale.objects.filter(sold_at__date__gte=date_from, sold_at__date__lte=date_to)
            otc_by_day = {
                row["sold_at__date"]: row["total"] or 0
                for row in otc_qs.values("sold_at__date").annotate(total=Sum("amount_paid"))
            }
            all_days = sorted(set(hospital_by_day) | set(otc_by_day))
            data = [
                {
                    "date": d.isoformat(),
                    "hospital_total": str(hospital_by_day.get(d, 0)),
                    "otc_total": str(otc_by_day.get(d, 0)),
                    "total": str(hospital_by_day.get(d, 0) + otc_by_day.get(d, 0)),
                }
                for d in all_days
            ]
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "doctor_revenue":
            data = list(
                invoices.filter(source_type=InvoiceSourceType.CONSULTATION, visit__doctor__isnull=False)
                .values("visit__doctor__first_name", "visit__doctor__last_name")
                .annotate(total=Sum("amount_paid")).order_by("-total")
            )
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "department_revenue":
            data = list(
                invoices.filter(source_type=InvoiceSourceType.CONSULTATION)
                .values("visit__department__name").annotate(total=Sum("amount_paid")).order_by("-total")
            )
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "patient_statistics":
            data = {
                "total_patients": Patient.objects.count(),
                "new_patients_in_range": Patient.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to).count(),
                "total_visits_in_range": Visit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to).count(),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "medicine_sales":
            data = list(
                PharmacyDispense.objects.filter(dispensed_at__date__gte=date_from, dispensed_at__date__lte=date_to)
                .values("prescription__medicine__name")
                .annotate(total_qty=Sum("quantity_dispensed")).order_by("-total_qty")
            )
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "otc_sales":
            data = list(
                OTCSaleItem.objects.filter(sale__sold_at__date__gte=date_from, sale__sold_at__date__lte=date_to)
                .values("medicine__name")
                .annotate(total_qty=Sum("quantity"), total_revenue=Sum("subtotal")).order_by("-total_revenue")
            )
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "lab_revenue":
            data = list(invoices.filter(source_type=InvoiceSourceType.LAB).aggregate(total=Sum("amount_paid")).items())
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "radiology_revenue":
            data = list(invoices.filter(source_type=InvoiceSourceType.RADIOLOGY).aggregate(total=Sum("amount_paid")).items())
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "consultation_revenue":
            data = list(invoices.filter(source_type=InvoiceSourceType.CONSULTATION).aggregate(total=Sum("amount_paid")).items())
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        elif report_type == "inpatient_revenue":
            data = list(invoices.filter(source_type=InvoiceSourceType.INPATIENT).aggregate(total=Sum("amount_paid")).items())
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, "data": data})

        # -------------------------------------------------------------
        # New analytical reports: cards + charts + summary table
        # -------------------------------------------------------------
        elif report_type == "opd_daily":
            target_date = date_to
            visits_qs = Visit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to)
            total_visits = visits_qs.count()
            total_patients = visits_qs.values("patient").distinct().count()
            dept_breakdown = list(visits_qs.values("department__name").annotate(count=Count("id")).order_by("-count")[:10])
            consultation_breakdown = list(visits_qs.values("consultation_type").annotate(count=Count("id")).order_by("-count"))
            revenue = payments.filter(invoice__source_type=InvoiceSourceType.CONSULTATION).aggregate(t=Sum("amount"))["t"] or 0

            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            trend = [{"name": d.isoformat(), "value": Visit.objects.filter(visit_date__date=d).count()} for d in last_7]

            data = {
                "cards": [
                    {"label": "Total OPD Visits", "value": total_visits},
                    {"label": "Unique Patients", "value": total_patients},
                    {"label": "Consultation Revenue", "value": f"KES {revenue}"},
                    {"label": "Departments Active", "value": len(dept_breakdown)},
                ],
                "charts": {
                    "by_department": {"title": "Visits by Department", "type": "bar",
                                       "data": [{"name": r["department__name"] or "Unknown", "value": r["count"]} for r in dept_breakdown]},
                    "trend": {"title": "Visits — Last 7 Days", "type": "line", "data": trend},
                    "by_type": {"title": "Consultation Type", "type": "pie",
                                "data": [{"name": r["consultation_type"], "value": r["count"]} for r in consultation_breakdown]},
                },
                "table": list(visits_qs.select_related("patient", "department", "doctor").values(
                    "visit_number", "patient__full_name", "department__name", "status", "visit_date"
                ).order_by("-visit_date")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "ipd_report":
            from inpatient.models import Admission, AdmissionStatus, Ward

            admissions_qs = Admission.objects.filter(admission_date__date__gte=date_from, admission_date__date__lte=date_to)
            active_count = Admission.objects.filter(status=AdmissionStatus.ADMITTED).count()
            admitted_in_range = admissions_qs.count()
            discharged_in_range = Admission.objects.filter(
                discharge_date__date__gte=date_from, discharge_date__date__lte=date_to
            ).count()
            los_list = [
                a.length_of_stay_days for a in Admission.objects.filter(
                    status=AdmissionStatus.DISCHARGED, discharge_date__date__gte=date_from, discharge_date__date__lte=date_to
                )
            ]
            avg_los = round(sum(los_list) / len(los_list), 1) if los_list else 0

            ward_occ = [{"name": w.name, "value": w.occupied_beds} for w in Ward.objects.filter(is_active=True)]
            type_breakdown = list(admissions_qs.values("admission_type").annotate(count=Count("id")))
            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            trend = [{"name": d.isoformat(), "value": Admission.objects.filter(admission_date__date=d).count()} for d in last_7]

            data = {
                "cards": [
                    {"label": "Active Admissions", "value": active_count},
                    {"label": "Admitted (range)", "value": admitted_in_range},
                    {"label": "Discharged (range)", "value": discharged_in_range},
                    {"label": "Avg Length of Stay", "value": f"{avg_los} days"},
                ],
                "charts": {
                    "occupancy": {"title": "Bed Occupancy by Ward", "type": "bar", "data": ward_occ},
                    "trend": {"title": "Admissions — Last 7 Days", "type": "line", "data": trend},
                    "by_type": {"title": "Admission Type", "type": "pie",
                                "data": [{"name": r["admission_type"], "value": r["count"]} for r in type_breakdown]},
                },
                "table": list(admissions_qs.select_related("patient", "bed__ward").values(
                    "admission_number", "patient__full_name", "bed__ward__name", "admission_type", "status", "admission_date"
                ).order_by("-admission_date")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "mch_report":
            from mch.models import AntenatalProfile, DeliveryRecord, ANCVisit, ChildImmunization, PregnancyStatus, ImmunizationStatus

            active_pregnancies = AntenatalProfile.objects.filter(status=PregnancyStatus.ACTIVE).count()
            deliveries_qs = DeliveryRecord.objects.filter(delivery_date__date__gte=date_from, delivery_date__date__lte=date_to)
            deliveries_count = deliveries_qs.count()
            high_risk = AntenatalProfile.objects.filter(high_risk=True, status=PregnancyStatus.ACTIVE).count()
            immunizations_due = ChildImmunization.objects.filter(status=ImmunizationStatus.DUE, due_date__lte=date.today()).count()

            mode_breakdown = list(deliveries_qs.values("mode_of_delivery").annotate(count=Count("id")))
            outcome_breakdown = list(deliveries_qs.values("outcome").annotate(count=Count("id")))
            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            anc_trend = [{"name": d.isoformat(), "value": ANCVisit.objects.filter(visit_date__date=d).count()} for d in last_7]

            data = {
                "cards": [
                    {"label": "Active Pregnancies", "value": active_pregnancies},
                    {"label": "Deliveries (range)", "value": deliveries_count},
                    {"label": "High Risk Pregnancies", "value": high_risk},
                    {"label": "Immunizations Due", "value": immunizations_due},
                ],
                "charts": {
                    "by_mode": {"title": "Delivery Mode", "type": "pie",
                                "data": [{"name": r["mode_of_delivery"], "value": r["count"]} for r in mode_breakdown]},
                    "anc_trend": {"title": "ANC Visits — Last 7 Days", "type": "line", "data": anc_trend},
                    "outcomes": {"title": "Delivery Outcomes", "type": "bar",
                                 "data": [{"name": r["outcome"], "value": r["count"]} for r in outcome_breakdown]},
                },
                "table": list(deliveries_qs.select_related("profile__mother").values(
                    "delivery_number", "profile__mother__full_name", "mode_of_delivery", "outcome", "delivery_date"
                ).order_by("-delivery_date")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "revenue_report":
            total_revenue = payments.aggregate(t=Sum("amount"))["t"] or 0
            outstanding_balance = sum((inv.balance for inv in Invoice.objects.filter(status__in=["UNPAID", "PARTIAL"])))
            method_breakdown = list(payments.values("method").annotate(total=Sum("amount")))
            source_breakdown = list(invoices.values("source_type").annotate(total=Sum("amount_paid")))
            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            trend = [
                {"name": d.isoformat(), "value": float(Payment.objects.filter(paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0)}
                for d in last_7
            ]

            data = {
                "cards": [
                    {"label": "Total Revenue", "value": f"KES {total_revenue}"},
                    {"label": "Outstanding Balance", "value": f"KES {outstanding_balance}"},
                    {"label": "Total Invoices", "value": invoices.count()},
                    {"label": "Total Payments", "value": payments.count()},
                ],
                "charts": {
                    "by_method": {"title": "Revenue by Payment Method", "type": "pie",
                                  "data": [{"name": r["method"], "value": float(r["total"] or 0)} for r in method_breakdown]},
                    "by_source": {"title": "Revenue by Source", "type": "bar",
                                  "data": [{"name": r["source_type"], "value": float(r["total"] or 0)} for r in source_breakdown]},
                    "trend": {"title": "Daily Revenue", "type": "line", "data": trend},
                },
                "table": list(payments.select_related("invoice", "cashier").values(
                    "receipt_number", "invoice__invoice_number", "amount", "method", "paid_at"
                ).order_by("-paid_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "drug_consumption":
            dispenses_qs = PharmacyDispense.objects.filter(dispensed_at__date__gte=date_from, dispensed_at__date__lte=date_to)
            otc_qs = OTCSaleItem.objects.filter(sale__sold_at__date__gte=date_from, sale__sold_at__date__lte=date_to)
            total_dispensed_qty = (dispenses_qs.aggregate(t=Sum("quantity_dispensed"))["t"] or 0) + \
                                   (otc_qs.aggregate(t=Sum("quantity"))["t"] or 0)
            low_stock_count = len([m for m in Medicine.objects.all() if m.is_low_stock])
            stock_transactions_count = StockTransaction.objects.filter(
                created_at__date__gte=date_from, created_at__date__lte=date_to
            ).count()

            combined = {}
            for row in dispenses_qs.values("prescription__medicine__name").annotate(qty=Sum("quantity_dispensed")):
                name = row["prescription__medicine__name"] or "Unknown"
                combined[name] = combined.get(name, 0) + (row["qty"] or 0)
            for row in otc_qs.values("medicine__name").annotate(qty=Sum("quantity")):
                name = row["medicine__name"] or "Unknown"
                combined[name] = combined.get(name, 0) + (row["qty"] or 0)
            top10 = sorted(combined.items(), key=lambda x: -x[1])[:10]
            top_medicine = top10[0][0] if top10 else "—"

            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            trend = [
                {"name": d.isoformat(), "value": PharmacyDispense.objects.filter(dispensed_at__date=d).aggregate(t=Sum("quantity_dispensed"))["t"] or 0}
                for d in last_7
            ]
            txn_type_breakdown = list(
                StockTransaction.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)
                .values("transaction_type").annotate(count=Count("id"))
            )

            data = {
                "cards": [
                    {"label": "Total Units Dispensed", "value": total_dispensed_qty},
                    {"label": "Top Medicine", "value": top_medicine},
                    {"label": "Low Stock Alerts", "value": low_stock_count},
                    {"label": "Stock Transactions", "value": stock_transactions_count},
                ],
                "charts": {
                    "top10": {"title": "Top 10 Medicines Dispensed", "type": "bar",
                              "data": [{"name": n, "value": q} for n, q in top10]},
                    "trend": {"title": "Pharmacy Dispenses — Last 7 Days", "type": "line", "data": trend},
                    "txn_types": {"title": "Stock Transaction Types", "type": "pie",
                                  "data": [{"name": r["transaction_type"], "value": r["count"]} for r in txn_type_breakdown]},
                },
                "table": [{"medicine": n, "total_quantity": q} for n, q in top10],
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "disease_statistics":
            diagnoses_qs = ConsultationDiagnosis.objects.filter(
                consultation__started_at__date__gte=date_from, consultation__started_at__date__lte=date_to
            )
            total_diagnoses = diagnoses_qs.count()
            unique_patients = diagnoses_qs.values("consultation__visit__patient").distinct().count()
            top_row = list(diagnoses_qs.values("icd10_code__description").annotate(count=Count("id")).order_by("-count")[:1])
            top_diagnosis = top_row[0]["icd10_code__description"] if top_row else "—"
            this_month_count = ConsultationDiagnosis.objects.filter(
                consultation__started_at__date__gte=date.today().replace(day=1)
            ).count()

            top10 = list(
                diagnoses_qs.values("icd10_code__code", "icd10_code__description")
                .annotate(count=Count("id")).order_by("-count")[:10]
            )
            last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
            trend = [
                {"name": d.isoformat(), "value": ConsultationDiagnosis.objects.filter(consultation__started_at__date=d).count()}
                for d in last_7
            ]
            category_breakdown = list(
                diagnoses_qs.values("icd10_code__category").annotate(count=Count("id")).order_by("-count")[:8]
            )

            data = {
                "cards": [
                    {"label": "Total Diagnoses", "value": total_diagnoses},
                    {"label": "Unique Patients", "value": unique_patients},
                    {"label": "Top Diagnosis", "value": top_diagnosis},
                    {"label": "Diagnoses This Month", "value": this_month_count},
                ],
                "charts": {
                    "top10": {"title": "Top 10 Diagnoses", "type": "bar",
                              "data": [{"name": r["icd10_code__description"] or r["icd10_code__code"], "value": r["count"]} for r in top10]},
                    "trend": {"title": "Diagnoses — Last 7 Days", "type": "line", "data": trend},
                    "categories": {"title": "By Category", "type": "pie",
                                   "data": [{"name": r["icd10_code__category"] or "Unspecified", "value": r["count"]} for r in category_breakdown]},
                },
                "table": [
                    {"code": r["icd10_code__code"], "description": r["icd10_code__description"], "count": r["count"]}
                    for r in top10
                ],
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "lab_tech_report":
            orders = LabOrder.objects.filter(ordered_at__date__gte=date_from, ordered_at__date__lte=date_to)
            completed = orders.filter(status=LabOrderStatus.COMPLETED)
            avg_turnaround = None
            completed_with_time = [o for o in completed.select_related("result") if hasattr(o, "result") and o.result]
            if completed_with_time:
                deltas = [(o.result.completed_at - o.ordered_at).total_seconds() / 3600 for o in completed_with_time if o.result.completed_at]
                avg_turnaround = round(sum(deltas) / len(deltas), 1) if deltas else None

            data = {
                "cards": [
                    {"label": "Total Orders", "value": orders.count()},
                    {"label": "Completed", "value": completed.count()},
                    {"label": "Pending", "value": orders.exclude(status__in=[LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED]).count()},
                    {"label": "Avg Turnaround (hrs)", "value": avg_turnaround or "—"},
                ],
                "charts": {
                    "top_tests": {"title": "Top Tests Ordered", "type": "bar",
                                "data": [{"name": r["test__name"], "value": r["count"]} for r in orders.values("test__name").annotate(count=Count("id")).order_by("-count")[:10]]},
                    "trend": {"title": "Orders — Daily", "type": "line",
                            "data": [{"name": str(d), "value": orders.filter(ordered_at__date=d).count()} for d in sorted(set(o.ordered_at.date() for o in orders))]},
                    "by_status": {"title": "Status Breakdown", "type": "pie",
                                "data": [{"name": r["status"], "value": r["count"]} for r in orders.values("status").annotate(count=Count("id"))]},
                },
                "table": list(orders.select_related("test").values("test__name", "status", "ordered_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "radiologist_report":
            orders = RadiologyOrder.objects.filter(ordered_at__date__gte=date_from, ordered_at__date__lte=date_to)
            data = {
                "cards": [
                    {"label": "Total Orders", "value": orders.count()},
                    {"label": "Reported", "value": orders.filter(status=RadiologyOrderStatus.REPORTED).count()},
                    {"label": "Awaiting Report", "value": orders.filter(status=RadiologyOrderStatus.DONE).count()},
                    {"label": "Pending Imaging", "value": orders.filter(status=RadiologyOrderStatus.PENDING).count()},
                ],
                "charts": {
                    "top_tests": {"title": "Top Tests Ordered", "type": "bar",
                                "data": [{"name": r["test__name"], "value": r["count"]} for r in orders.values("test__name").annotate(count=Count("id")).order_by("-count")[:10]]},
                    "trend": {"title": "Orders — Daily", "type": "line",
                            "data": [{"name": str(d), "value": orders.filter(ordered_at__date=d).count()} for d in sorted(set(o.ordered_at.date() for o in orders))]},
                    "by_status": {"title": "Status Breakdown", "type": "pie",
                                "data": [{"name": r["status"], "value": r["count"]} for r in orders.values("status").annotate(count=Count("id"))]},
                },
                "table": list(orders.select_related("test").values("test__name", "status", "ordered_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "pharmacist_report":
            dispenses = PharmacyDispense.objects.filter(dispensed_at__date__gte=date_from, dispensed_at__date__lte=date_to)
            low_stock = len([m for m in Medicine.objects.all() if m.is_low_stock])
            expiring_soon = MedicineBatch.objects.filter(expiry_date__lte=date.today() + timedelta(days=30), expiry_date__gte=date.today(), quantity_remaining__gt=0).count()
            data = {
                "cards": [
                    {"label": "Dispensed (range)", "value": dispenses.count()},
                    {"label": "Low Stock Items", "value": low_stock},
                    {"label": "Batches Expiring (30d)", "value": expiring_soon},
                    {"label": "OTC Sales (range)", "value": OTCSale.objects.filter(sold_at__date__gte=date_from, sold_at__date__lte=date_to).count()},
                ],
                "charts": {
                    "top_meds": {"title": "Top Medicines Dispensed", "type": "bar",
                                "data": [{"name": r["prescription__medicine__name"], "value": r["qty"]} for r in dispenses.values("prescription__medicine__name").annotate(qty=Sum("quantity_dispensed")).order_by("-qty")[:10]]},
                    "trend": {"title": "Dispenses — Daily", "type": "line",
                            "data": [{"name": str(d), "value": dispenses.filter(dispensed_at__date=d).count()} for d in sorted(set(x.dispensed_at.date() for x in dispenses))]},
                    "stock_txn": {"title": "Stock Transactions", "type": "pie",
                                "data": [{"name": r["transaction_type"], "value": r["count"]} for r in StockTransaction.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to).values("transaction_type").annotate(count=Count("id"))]},
                },
                "table": list(dispenses.select_related("prescription__medicine").values("prescription__medicine__name", "quantity_dispensed", "dispensed_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "mortuary_report":
            from mortuary.models import MortuaryAdmission, MortuaryStatus
            cases = MortuaryAdmission.objects.filter(admitted_at__date__gte=date_from, admitted_at__date__lte=date_to)
            data = {
                "cards": [
                    {"label": "Cases (range)", "value": cases.count()},
                    {"label": "Currently In Storage", "value": MortuaryAdmission.objects.filter(status=MortuaryStatus.ADMITTED).count()},
                    {"label": "Released (range)", "value": cases.filter(status=MortuaryStatus.RELEASED).count()},
                    {"label": "Avg Days in Storage", "value": round(sum(c.days_in_storage for c in cases) / cases.count(), 1) if cases.count() else 0},
                ],
                "charts": {
                    "by_source": {"title": "Cases by Source", "type": "bar",
                                "data": [{"name": r["source"], "value": r["count"]} for r in cases.values("source").annotate(count=Count("id"))]},
                    "trend": {"title": "Admissions — Daily", "type": "line",
                            "data": [{"name": str(d), "value": cases.filter(admitted_at__date=d).count()} for d in sorted(set(c.admitted_at.date() for c in cases))]},
                    "by_status": {"title": "Status Breakdown", "type": "pie",
                                "data": [{"name": r["status"], "value": r["count"]} for r in cases.values("status").annotate(count=Count("id"))]},
                },
                "table": list(cases.values("case_number", "deceased_name_freetext", "source", "status", "admitted_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "ambulance_report":
            from ambulance.models import AmbulanceDispatch, DispatchStatus
            dispatches = AmbulanceDispatch.objects.filter(requested_at__date__gte=date_from, requested_at__date__lte=date_to)
            data = {
                "cards": [
                    {"label": "Dispatches (range)", "value": dispatches.count()},
                    {"label": "Completed", "value": dispatches.filter(status=DispatchStatus.COMPLETED).count()},
                    {"label": "Cancelled", "value": dispatches.filter(status=DispatchStatus.CANCELLED).count()},
                    {"label": "Active Now", "value": AmbulanceDispatch.objects.exclude(status__in=[DispatchStatus.COMPLETED, DispatchStatus.CANCELLED]).count()},
                ],
                "charts": {
                    "by_type": {"title": "Dispatches by Type", "type": "bar",
                            "data": [{"name": r["dispatch_type"], "value": r["count"]} for r in dispatches.values("dispatch_type").annotate(count=Count("id"))]},
                    "trend": {"title": "Dispatches — Daily", "type": "line",
                            "data": [{"name": str(d), "value": dispatches.filter(requested_at__date=d).count()} for d in sorted(set(x.requested_at.date() for x in dispatches))]},
                    "by_status": {"title": "Status Breakdown", "type": "pie",
                                "data": [{"name": r["status"], "value": r["count"]} for r in dispatches.values("status").annotate(count=Count("id"))]},
                },
                "table": list(dispatches.select_related("ambulance").values("dispatch_number", "ambulance__registration_number", "dispatch_type", "status", "requested_at")[:200]),
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "yearly_revenue_trend":
            year = int(request.query_params.get("year") or date.today().year)

            month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            hospital_by_month = {
                row["paid_at__month"]: row["total"] or 0
                for row in Payment.objects.filter(paid_at__year=year)
                .values("paid_at__month").annotate(total=Sum("amount"))
            }
            otc_by_month = {
                row["sold_at__month"]: row["total"] or 0
                for row in OTCSale.objects.filter(sold_at__year=year)
                .values("sold_at__month").annotate(total=Sum("amount_paid"))
            }

            data = [
                {
                    "month": month_labels[m - 1],
                    "month_number": m,
                    "hospital_total": str(hospital_by_month.get(m, 0)),
                    "otc_total": str(otc_by_month.get(m, 0)),
                    "total": str(hospital_by_month.get(m, 0) + otc_by_month.get(m, 0)),
                }
                for m in range(1, 13)
            ]

            # Years that actually have data, so the frontend dropdown only offers
            # real options (falls back to the current year if there's no data yet).
            hospital_years = Payment.objects.values_list("paid_at__year", flat=True).distinct()
            otc_years = OTCSale.objects.values_list("sold_at__year", flat=True).distinct()
            available_years = sorted(set(list(hospital_years) + list(otc_years)), reverse=True)
            if not available_years:
                available_years = [date.today().year]

            return Response({
                "type": report_type,
                "year": year,
                "available_years": available_years,
                "data": data,
            })

        elif report_type == "patient_demographics":
            # Distinct patients who had a visit inside the selected date range —
            # same range as the rest of the overview charts on this page.
            patient_ids = Visit.objects.filter(
                visit_date__date__gte=date_from, visit_date__date__lte=date_to
            ).values_list("patient_id", flat=True).distinct()
            patients_qs = Patient.objects.filter(id__in=patient_ids)

            age_counts = {}
            gender_counts = {}
            for p in patients_qs:
                grp = _age_group(p.age)
                age_counts[grp] = age_counts.get(grp, 0) + 1
                gender_counts[p.gender] = gender_counts.get(p.gender, 0) + 1

            age_data = [{"name": g, "value": age_counts[g]} for g in _AGE_GROUP_ORDER if age_counts.get(g)]
            gender_data = [{"name": _GENDER_LABELS.get(g, g), "value": c} for g, c in gender_counts.items()]

            most_common_age_group = max(age_counts.items(), key=lambda x: x[1])[0] if age_counts else "—"

            data = {
                "cards": [
                    {"label": "Patients Seen", "value": patients_qs.count()},
                    {"label": "Most Common Age Group", "value": most_common_age_group},
                    {"label": "Male", "value": gender_counts.get("MALE", 0)},
                    {"label": "Female", "value": gender_counts.get("FEMALE", 0)},
                ],
                "charts": {
                    "age_groups": {"title": "Patients by Age Group", "type": "bar", "data": age_data},
                    "gender": {"title": "Patients by Gender", "type": "pie", "data": gender_data},
                },
            }
            return Response({"type": report_type, "date_from": date_from, "date_to": date_to, **data})

        elif report_type == "disease_top_12m":
            # Rolling 12-month window ending today — deliberately ignores
            # date_from/date_to, this chart has no filter of its own.
            months = _last_12_months(date.today())
            start = date(months[0][0], months[0][1], 1)
            end = date.today()

            diagnoses_qs = ConsultationDiagnosis.objects.filter(
                consultation__started_at__date__gte=start, consultation__started_at__date__lte=end
            )
            top = list(
                diagnoses_qs.values("icd10_code__code", "icd10_code__description")
                .annotate(count=Count("id")).order_by("-count")[:10]
            )

            data = {
                "cards": [
                    {"label": "Total Diagnoses (12mo)", "value": diagnoses_qs.count()},
                    {"label": "Top Disease", "value": top[0]["icd10_code__description"] if top else "—"},
                    {"label": "Distinct Diagnoses", "value": diagnoses_qs.values("icd10_code").distinct().count()},
                    {"label": "Period", "value": f"{start.isoformat()} to {end.isoformat()}"},
                ],
                "charts": {
                    "top10": {
                        "title": "Top 10 Diseases — Last 12 Months",
                        "type": "bar",
                        "data": [
                            {
                                "name": r["icd10_code__description"] or r["icd10_code__code"],
                                "code": r["icd10_code__code"],
                                "value": r["count"],
                            }
                            for r in top
                        ],
                    },
                },
            }
            return Response({"type": report_type, "start": start.isoformat(), "end": end.isoformat(), **data})

        elif report_type == "disease_monthly_detail":
            icd10_code = request.query_params.get("icd10_code")
            if not icd10_code:
                return Response({"detail": "icd10_code query param is required."}, status=status.HTTP_400_BAD_REQUEST)

            year = int(request.query_params.get("year") or date.today().year)
            month = int(request.query_params.get("month") or date.today().month)

            diagnoses_qs = ConsultationDiagnosis.objects.filter(
                icd10_code__code=icd10_code,
                consultation__started_at__year=year,
                consultation__started_at__month=month,
            ).select_related("consultation__visit__patient", "icd10_code")

            disease_name = (
                ICD10Code.objects.filter(code=icd10_code).values_list("description", flat=True).first()
                or icd10_code
            )

            age_counts = {}
            gender_counts = {}
            for dgn in diagnoses_qs:
                patient = dgn.consultation.visit.patient
                grp = _age_group(patient.age)
                age_counts[grp] = age_counts.get(grp, 0) + 1
                gender_counts[patient.gender] = gender_counts.get(patient.gender, 0) + 1

            most_affected_age_group = max(age_counts.items(), key=lambda x: x[1])[0] if age_counts else "—"
            age_data = [{"name": g, "value": age_counts[g]} for g in _AGE_GROUP_ORDER if age_counts.get(g)]
            gender_data = [{"name": _GENDER_LABELS.get(g, g), "value": c} for g, c in gender_counts.items()]

            data = {
                "disease": disease_name,
                "icd10_code": icd10_code,
                "year": year,
                "month": month,
                "cards": [
                    {"label": "Total Cases", "value": diagnoses_qs.count()},
                    {"label": "Most Affected Age Group", "value": most_affected_age_group},
                    {"label": "Male Cases", "value": gender_counts.get("MALE", 0)},
                    {"label": "Female Cases", "value": gender_counts.get("FEMALE", 0)},
                ],
                "charts": {
                    "age_groups": {"title": f"{disease_name} — Cases by Age Group", "type": "bar", "data": age_data},
                    "gender": {"title": f"{disease_name} — Cases by Gender", "type": "pie", "data": gender_data},
                },
            }
            return Response({"type": report_type, **data})

        else:
            return Response({"detail": "Unknown report type."}, status=status.HTTP_400_BAD_REQUEST)

class BulkPaymentViewSet(viewsets.GenericViewSet):
    """
    Patient-search-first bulk payment flow. Doesn't touch PaymentViewSet or
    InvoiceViewSet — those remain exactly as they are for the existing
    single-invoice Payments.jsx screen.
    """
    permission_classes = [IsCashierOrAccountant, RequiresOpenTill]
    queryset = BulkPayment.objects.select_related("patient", "cashier").prefetch_related("lines__invoice", "lines__payment")
    filterset_fields = ["method"]
    search_fields = ["receipt_number", "patient__full_name", "patient__hospital_number", "reference_number"]

    @action(detail=False, methods=["get"], url_path="outstanding-invoices")
    def outstanding_invoices(self, request):
        """
        GET /api/bulk-payments/outstanding-invoices/?patient=<uuid>
        Returns every unpaid/partial invoice for a patient plus the running
        total — this is what powers the "search patient, see everything
        they owe" screen.
        """
        patient_id = request.query_params.get("patient")
        if not patient_id:
            return Response({"detail": "patient query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        patient = Patient.objects.filter(pk=patient_id).first()
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        invoices = Invoice.objects.filter(patient=patient).exclude(status__in=["PAID", "CANCELLED"]).order_by("created_at")
        outstanding = [inv for inv in invoices if inv.balance > 0]
        total_outstanding = sum((inv.balance for inv in outstanding), start=0)

        return Response({
            "patient": {"id": str(patient.id), "full_name": patient.full_name, "hospital_number": patient.hospital_number},
            "invoices": InvoiceSerializer(outstanding, many=True).data,
            "total_outstanding": str(total_outstanding),
            "invoice_count": len(outstanding),
        })

    def create(self, request, *args, **kwargs):
        """
        POST /api/bulk-payments/
        Applies `amount` across the selected invoice_ids, oldest first, in
        full per invoice until the amount runs out — the last invoice it
        touches may only get a partial amount, which is expected and correct.
        Creates one real Payment row per invoice actually touched (so every
        existing single-invoice Payment/receipt mechanism keeps working
        completely unchanged), wrapped in one BulkPayment for the combined receipt.
        """
        serializer = CreateBulkPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        invoices = list(
            Invoice.objects.filter(id__in=data["invoice_ids"], patient=patient)
            .exclude(status__in=["PAID", "CANCELLED"])
            .order_by("created_at")
        )
        if not invoices:
            raise ValidationError({"invoice_ids": "No matching outstanding invoices found for this patient."})

        remaining = data["amount"]
        max_payable = sum((inv.balance for inv in invoices), start=0)
        if remaining > max_payable:
            raise ValidationError({
                "amount": f"Amount (KES {remaining}) exceeds the total balance of selected invoices (KES {max_payable})."
            })

        with transaction.atomic():
            bulk_payment = BulkPayment.objects.create(
                patient=patient, total_amount=data["amount"], method=data["method"],
                reference_number=data.get("reference_number", ""), cashier=request.user,
            )

            for invoice in invoices:
                if remaining <= 0:
                    break
                invoice_balance = invoice.balance
                if invoice_balance <= 0:
                    continue

                amount_for_this_invoice = min(remaining, invoice_balance)

                payment = Payment.objects.create(
                    invoice=invoice, amount=amount_for_this_invoice, method=data["method"],
                    reference_number=data.get("reference_number", ""), cashier=request.user,
                )
                BulkPaymentLine.objects.create(
                    bulk_payment=bulk_payment, invoice=invoice, payment=payment,
                    amount_applied=amount_for_this_invoice,
                )
                remaining -= amount_for_this_invoice

        return Response(BulkPaymentSerializer(bulk_payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        """Combined receipt — every invoice covered by this bulk transaction, with per-service breakdown."""
        bulk_payment = self.get_object()
        return Response(BulkPaymentSerializer(bulk_payment).data)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = BulkPaymentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = BulkPaymentSerializer(queryset, many=True)
        return Response(serializer.data)
        
    


class ITSupportDashboardView(APIView):
    permission_classes = [IsITSupportOrSuperAdmin]

    def get(self, request):
        today = date.today()
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]

        cards = {
            "open_tickets": Ticket.objects.exclude(status__in=[TicketStatus.CLOSED]).count(),
            "critical_tickets": Ticket.objects.filter(priority="CRITICAL").exclude(status=TicketStatus.CLOSED).count(),
            "locked_accounts": AccountLockout.objects.filter(is_locked=True).count(),
            "failed_logins_today": LoginAttempt.objects.filter(status=LoginAttemptStatus.FAILED_PASSWORD, attempted_at__date=today).count(),
            "total_staff_accounts": User.objects.filter(is_active_staff=True, is_deleted=False).count(),
            "security_events_today": SecurityAuditLog.objects.filter(occurred_at__date=today).count(),
        }

        ticket_trend = [{"name": d.isoformat(), "value": Ticket.objects.filter(raised_at__date=d).count()} for d in days]
        ticket_by_category = list(Ticket.objects.exclude(status=TicketStatus.CLOSED).values("category").annotate(count=Count("id")))
        ticket_by_priority = list(Ticket.objects.exclude(status=TicketStatus.CLOSED).values("priority").annotate(count=Count("id")))

        return Response({
            "cards": cards,
            "line": {"title": "Tickets Raised — Last 7 Days", "data": ticket_trend},
            "bar": {"title": "Open Tickets by Category", "data": [{"name": r["category"], "value": r["count"]} for r in ticket_by_category]},
            "pie": {"title": "Open Tickets by Priority", "data": [{"name": r["priority"], "value": r["count"]} for r in ticket_by_priority]},
        })
        
        
    