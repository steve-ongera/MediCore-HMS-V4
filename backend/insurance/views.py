from io import BytesIO

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin, IsCashierOrAccountant

from .models import Insurer, PatientInsurancePolicy, EligibilityCheck, InsuranceClaim, ClaimItem, ClaimStatus
from .serializers import (
    InsurerSerializer, PatientInsurancePolicySerializer, EligibilityCheckSerializer,
    InsuranceClaimSerializer, InsuranceClaimListSerializer, ClaimItemSerializer,
    CreateClaimSerializer, ApplyResponseSerializer,
)
from .services import run_eligibility_check, create_claim, submit_claim, apply_manual_response, settle_claim


class InsurerViewSet(BaseModelViewSet):
    queryset = Insurer.objects.filter(is_active=True)
    serializer_class = InsurerSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]
    search_fields = ["name", "code"]
    filterset_fields = ["insurer_type"]


class PatientInsurancePolicyViewSet(BaseModelViewSet):
    queryset = PatientInsurancePolicy.objects.select_related("patient", "insurer").all()
    serializer_class = PatientInsurancePolicySerializer
    search_fields = ["member_number", "patient__full_name", "patient__hospital_number"]
    filterset_fields = ["insurer", "is_active"]

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="verify-eligibility")
    def verify_eligibility(self, request, pk=None):
        policy = self.get_object()
        check = run_eligibility_check(policy, user=request.user)
        return Response(EligibilityCheckSerializer(check).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="eligibility-history")
    def eligibility_history(self, request, pk=None):
        policy = self.get_object()
        checks = policy.eligibility_checks.all()[:20]
        return Response(EligibilityCheckSerializer(checks, many=True).data)


class InsuranceClaimViewSet(BaseModelViewSet):
    """
    No django_filters FilterSet, no separate exports module — everything
    the claims endpoints need lives here.
    """
    queryset = InsuranceClaim.objects.select_related("patient", "policy__insurer").prefetch_related("items__invoice").all()
    search_fields = ["claim_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return InsuranceClaimListSerializer
        return InsuranceClaimSerializer

    # ---- shared filtering, used by both list() and export() -------------
    def _apply_filters(self, qs, params):
        status_param = params.get("status")
        insurer_param = params.get("insurer")
        search = params.get("search")
        date_from = params.get("date_from")
        date_to = params.get("date_to")

        if status_param:
            qs = qs.filter(status=status_param)
        if insurer_param:
            qs = qs.filter(policy__insurer_id=insurer_param)
        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search)
                | Q(patient__full_name__icontains=search)
                | Q(patient__hospital_number__icontains=search)
            )
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs

    def get_queryset(self):
        qs = super().get_queryset()
        return self._apply_filters(qs, self.request.query_params)

    def create(self, request, *args, **kwargs):
        serializer = CreateClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        policy = PatientInsurancePolicy.objects.filter(pk=data["policy"], patient=patient).first()
        if not policy:
            raise ValidationError({"policy": "Policy not found for this patient."})

        try:
            with transaction.atomic():
                claim = create_claim(
                    patient=patient, policy=policy, invoice_ids=data["invoice_ids"],
                    user=request.user, notes=data.get("notes", ""),
                )
        except ValueError as e:
            raise ValidationError({"detail": str(e)})

        return Response(InsuranceClaimSerializer(claim).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        claim = self.get_object()
        if claim.status != ClaimStatus.DRAFT:
            raise ValidationError({"detail": "Only draft claims can be submitted."})
        result = submit_claim(claim, user=request.user)
        response_data = InsuranceClaimSerializer(claim).data
        response_data["gateway_result"] = result
        return Response(response_data)

    @action(detail=True, methods=["post"], url_path="apply-response")
    def apply_response(self, request, pk=None):
        claim = self.get_object()
        serializer = ApplyResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            item_approvals = data.get("item_approvals") or {}
            if item_approvals:
                total_approved = 0
                for item in claim.items.all():
                    amt = item_approvals.get(str(item.id))
                    if amt is not None:
                        item.amount_approved = amt
                        item.save(update_fields=["amount_approved"])
                        total_approved += amt
                approved_amount = total_approved
            else:
                approved_amount = data.get("approved_amount")

            apply_manual_response(
                claim, status=data["status"], approved_amount=approved_amount,
                rejection_reason=data.get("rejection_reason", ""), user=request.user,
            )

        return Response(InsuranceClaimSerializer(claim).data)

    @action(detail=True, methods=["post"], url_path="settle")
    def settle(self, request, pk=None):
        claim = self.get_object()
        try:
            with transaction.atomic():
                payments = settle_claim(claim, user=request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})

        return Response({
            "claim": InsuranceClaimSerializer(claim).data,
            "payments_created": len(payments),
        })

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        claim = self.get_object()
        if claim.status not in (ClaimStatus.DRAFT, ClaimStatus.SUBMITTED):
            raise ValidationError({"detail": "Only draft or submitted claims can be cancelled."})
        claim.status = ClaimStatus.CANCELLED
        claim.save(update_fields=["status"])
        return Response(InsuranceClaimSerializer(claim).data)

    # ---- export, no separate module --------------------------------------
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        fmt = request.query_params.get("format", "xlsx")
        qs = self._apply_filters(
            InsuranceClaim.objects.select_related("patient", "policy__insurer"),
            request.query_params,
        )
        return self._export_pdf(qs) if fmt == "pdf" else self._export_xlsx(qs)

    @staticmethod
    def _export_xlsx(queryset):
        wb = Workbook()
        ws = wb.active
        ws.title = "Insurance Claims"
        ws.append(["Claim #", "Patient", "Hospital #", "Insurer", "Status", "Claimed", "Approved", "Created"])
        for c in queryset:
            ws.append([
                c.claim_number,
                c.patient.full_name,
                c.patient.hospital_number,
                c.policy.insurer.name,
                c.status,
                float(c.total_claimed or 0),
                float(c.total_approved or 0),
                c.created_at.strftime("%Y-%m-%d %H:%M"),
            ])
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="insurance_claims.xlsx"'
        wb.save(response)
        return response

    @staticmethod
    def _export_pdf(queryset):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        data = [["Claim #", "Patient", "Insurer", "Status", "Claimed", "Approved"]]
        for c in queryset:
            data.append([
                c.claim_number, c.patient.full_name, c.policy.insurer.name,
                c.status, str(c.total_claimed), str(c.total_approved),
            ])
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        doc.build([table])
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="insurance_claims.pdf"'
        return response