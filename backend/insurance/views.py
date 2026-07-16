from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

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
    queryset = InsuranceClaim.objects.select_related("patient", "policy__insurer").prefetch_related("items__invoice").all()
    filterset_fields = ["status", "policy__insurer"]
    search_fields = ["claim_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return InsuranceClaimListSerializer
        return InsuranceClaimSerializer

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
        """
        Records the insurer's decision — used for SHA's real/mocked response
        and for manually updating private-insurer claims after a TPA/portal
        response comes back. Optionally accepts per-item approved amounts.
        """
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
                if approved_amount is not None:
                    # No per-item breakdown given — spread evenly won't be accurate,
                    # so just record the total on the claim; settlement will need
                    # per-item amounts filled in later if partial.
                    pass

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