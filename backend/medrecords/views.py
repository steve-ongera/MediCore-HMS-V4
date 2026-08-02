from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from django.db.models import Count

from api.models import Patient
from api.permissions import HasRole, ReadOnlyOrSuperAdmin
from api.models import Role

from .models import (
    PatientFile, FileStatus, FileMovement, DocumentAttachment, BirthRegister,
    DeathRegister, Referral, ReferralStatus, DischargeSummary, RecordRequest,
    RecordRequestStatus, RecordAuditTrail, RecordAuditAction,
)
from .serializers import (
    PatientFileSerializer, PatientFileListSerializer, CheckoutFileSerializer,
    DocumentAttachmentSerializer, BirthRegisterSerializer, DeathRegisterSerializer,
    ReferralSerializer, DischargeSummarySerializer, RecordRequestSerializer,
    RecordAuditTrailSerializer, DenyRequestSerializer,
)
from .services import log_record_access


class IsHIMStaff(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.HEALTH_RECORDS_OFFICER, Role.MEDICAL_RECORDS_OFFICER]
        return super().has_permission(request, view)


class PatientFileViewSet(viewsets.ModelViewSet):
    queryset = PatientFile.objects.select_related("patient", "current_custodian").prefetch_related("movements").all()
    permission_classes = [IsHIMStaff]
    filterset_fields = ["status"]
    search_fields = ["file_number", "patient__full_name", "patient__hospital_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientFileListSerializer
        return PatientFileSerializer

    def create(self, request, *args, **kwargs):
        patient_id = request.data.get("patient")
        patient = Patient.objects.filter(pk=patient_id).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})
        if hasattr(patient, "medical_file"):
            raise ValidationError({"detail": "This patient already has a file record."})

        pfile = PatientFile.objects.create(patient=patient, created_by=request.user, current_location=request.data.get("current_location", ""))
        return Response(PatientFileSerializer(pfile).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        pfile = self.get_object()
        if pfile.status == FileStatus.CHECKED_OUT:
            raise ValidationError({"detail": "This file is already checked out."})

        serializer = CheckoutFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            FileMovement.objects.create(
                patient_file=pfile, action="CHECKED_OUT", from_custodian=pfile.current_custodian,
                to_custodian_id=data["to_custodian"], location=data.get("location", ""),
                reason=data.get("reason", ""), recorded_by=request.user,
            )
            pfile.status = FileStatus.CHECKED_OUT
            pfile.current_custodian_id = data["to_custodian"]
            pfile.current_location = data.get("location", pfile.current_location)
            pfile.checked_out_at = timezone.now()
            pfile.expected_return_at = data.get("expected_return_at")
            pfile.save()

        log_record_access(pfile.patient, RecordAuditAction.FILE_CHECKED_OUT, request.user, request, f"Checked out to {pfile.current_custodian}")
        return Response(PatientFileSerializer(pfile).data)

    @action(detail=True, methods=["post"], url_path="return-file")
    def return_file(self, request, pk=None):
        pfile = self.get_object()
        if pfile.status != FileStatus.CHECKED_OUT:
            raise ValidationError({"detail": "This file isn't currently checked out."})

        with transaction.atomic():
            FileMovement.objects.create(
                patient_file=pfile, action="RETURNED", from_custodian=pfile.current_custodian,
                to_custodian=None, location=request.data.get("location", "Records Room"),
                reason=request.data.get("reason", ""), recorded_by=request.user,
            )
            pfile.status = FileStatus.IN_ARCHIVE
            pfile.current_custodian = None
            pfile.current_location = request.data.get("location", "Records Room")
            pfile.checked_out_at = None
            pfile.expected_return_at = None
            pfile.save()

        log_record_access(pfile.patient, RecordAuditAction.FILE_RETURNED, request.user, request)
        return Response(PatientFileSerializer(pfile).data)

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        qs = self.get_queryset().filter(status=FileStatus.CHECKED_OUT, expected_return_at__lt=timezone.now())
        return Response(PatientFileListSerializer(qs, many=True).data)


class DocumentAttachmentViewSet(viewsets.ModelViewSet):
    queryset = DocumentAttachment.objects.select_related("patient", "uploaded_by").all()
    serializer_class = DocumentAttachmentSerializer
    permission_classes = [IsHIMStaff]
    filterset_fields = ["patient", "document_type"]
    parser_classes = None  # DRF auto-detects multipart for FileField, no override needed

    def perform_create(self, serializer):
        doc = serializer.save(uploaded_by=self.request.user)
        log_record_access(doc.patient, RecordAuditAction.DOCUMENT_UPLOADED, self.request.user, self.request, doc.title)


class BirthRegisterViewSet(viewsets.ModelViewSet):
    queryset = BirthRegister.objects.select_related("mother", "attending_staff").all()
    serializer_class = BirthRegisterSerializer
    permission_classes = [IsHIMStaff]
    search_fields = ["registration_number", "child_name", "mother__full_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)


class DeathRegisterViewSet(viewsets.ModelViewSet):
    queryset = DeathRegister.objects.select_related("patient", "certifying_doctor").all()
    serializer_class = DeathRegisterSerializer
    permission_classes = [IsHIMStaff]
    search_fields = ["registration_number", "deceased_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)


class ReferralViewSet(viewsets.ModelViewSet):
    queryset = Referral.objects.select_related("patient", "receiving_doctor").all()
    serializer_class = ReferralSerializer
    filterset_fields = ["direction", "status"]
    search_fields = ["referral_number", "patient__full_name", "facility_name"]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        referral = self.get_object()
        new_status = request.data.get("status")
        if new_status not in ReferralStatus.values:
            raise ValidationError({"status": "Invalid status."})
        referral.status = new_status
        if new_status in (ReferralStatus.COMPLETED, ReferralStatus.DECLINED):
            referral.resolved_at = timezone.now()
        referral.save()
        return Response(ReferralSerializer(referral).data)


class DischargeSummaryViewSet(viewsets.ModelViewSet):
    queryset = DischargeSummary.objects.select_related("admission__patient").all()
    serializer_class = DischargeSummarySerializer
    filterset_fields = ["is_complete"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        summary = self.get_object()
        summary.is_complete = True
        summary.completed_by = request.user
        summary.completed_at = timezone.now()
        summary.save(update_fields=["is_complete", "completed_by", "completed_at"])
        return Response(DischargeSummarySerializer(summary).data)

    @action(detail=False, methods=["get"], url_path="incomplete")
    def incomplete(self, request):
        qs = self.get_queryset().filter(is_complete=False)
        return Response(DischargeSummarySerializer(qs, many=True).data)


class RecordRequestViewSet(viewsets.ModelViewSet):
    queryset = RecordRequest.objects.select_related("patient", "requested_by", "reviewed_by").all()
    serializer_class = RecordRequestSerializer
    filterset_fields = ["status", "purpose"]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    def get_permissions(self):
        if self.action in ("approve", "deny", "fulfill"):
            return [IsHIMStaff()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != RecordRequestStatus.PENDING:
            raise ValidationError({"detail": "Only pending requests can be approved."})
        req.status = RecordRequestStatus.APPROVED
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.save()
        return Response(RecordRequestSerializer(req).data)

    @action(detail=True, methods=["post"], url_path="deny")
    def deny(self, request, pk=None):
        req = self.get_object()
        if req.status != RecordRequestStatus.PENDING:
            raise ValidationError({"detail": "Only pending requests can be denied."})
        serializer = DenyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req.status = RecordRequestStatus.DENIED
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.denial_reason = serializer.validated_data["denial_reason"]
        req.save()
        return Response(RecordRequestSerializer(req).data)

    @action(detail=True, methods=["post"], url_path="fulfill")
    def fulfill(self, request, pk=None):
        req = self.get_object()
        if req.status != RecordRequestStatus.APPROVED:
            raise ValidationError({"detail": "Only approved requests can be fulfilled."})
        req.status = RecordRequestStatus.FULFILLED
        req.fulfilled_at = timezone.now()
        req.save()
        log_record_access(req.patient, RecordAuditAction.EXPORTED, request.user, request, f"Fulfilled record request {req.request_number}")
        return Response(RecordRequestSerializer(req).data)


class RecordAuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only — same immutability discipline as security.SecurityAuditLog."""
    queryset = RecordAuditTrail.objects.select_related("patient", "performed_by").all()
    serializer_class = RecordAuditTrailSerializer
    permission_classes = [IsHIMStaff]
    filterset_fields = ["patient", "action"]
    
    
    

class MedRecordsStatsView(APIView):
    permission_classes = [IsHIMStaff]

    def get(self, request):
        from datetime import date, timedelta

        total_files = PatientFile.objects.count()
        checked_out = PatientFile.objects.filter(status=FileStatus.CHECKED_OUT).count()
        overdue = PatientFile.objects.filter(status=FileStatus.CHECKED_OUT, expected_return_at__lt=timezone.now()).count()
        pending_requests = RecordRequest.objects.filter(status=RecordRequestStatus.PENDING).count()
        incomplete_discharges = DischargeSummary.objects.filter(is_complete=False).count()

        last_30 = date.today() - timedelta(days=30)
        births_30d = BirthRegister.objects.filter(date_of_birth__gte=last_30).count()
        deaths_30d = DeathRegister.objects.filter(date_of_death__date__gte=last_30).count()

        by_status = list(PatientFile.objects.values("status").annotate(count=Count("id")))
        referral_by_status = list(Referral.objects.values("direction", "status").annotate(count=Count("id")))
        request_by_purpose = list(RecordRequest.objects.values("purpose").annotate(count=Count("id")))

        last_7 = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
        access_trend = [{"name": d.isoformat(), "value": RecordAuditTrail.objects.filter(occurred_at__date=d).count()} for d in last_7]

        return Response({
            "cards": {
                "total_files": total_files, "checked_out": checked_out, "overdue": overdue,
                "pending_requests": pending_requests, "incomplete_discharges": incomplete_discharges,
                "births_30d": births_30d, "deaths_30d": deaths_30d,
            },
            "file_status_breakdown": [{"name": r["status"], "value": r["count"]} for r in by_status],
            "referral_breakdown": referral_by_status,
            "request_purpose_breakdown": [{"name": r["purpose"], "value": r["count"]} for r in request_by_purpose],
            "access_trend_7d": access_trend,
        })