from rest_framework import serializers

from .models import Insurer, PatientInsurancePolicy, EligibilityCheck, InsuranceClaim, ClaimItem, ClaimStatus


class InsurerSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = Insurer
        fields = ["id", "name", "code", "insurer_type", "requires_preauth", "contact_email", "contact_phone", "is_active"]


class PatientInsurancePolicySerializer(serializers.ModelSerializer):
    insurer_name = serializers.CharField(source="insurer.name", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    is_currently_valid = serializers.BooleanField(read_only=True)
    latest_eligibility_status = serializers.SerializerMethodField()
    last_verified_at = serializers.SerializerMethodField()

    class Meta:
        model = PatientInsurancePolicy
        fields = [
            "id", "patient", "patient_name", "insurer", "insurer_name", "member_number",
            "valid_from", "valid_to", "is_currently_valid",
            "latest_eligibility_status", "last_verified_at",
        ]

    def get_latest_eligibility_status(self, obj):
        """
        'Verified' means an EligibilityCheck has actually been run against
        this policy — not just that valid_to hasn't passed. A policy can be
        date-valid but never actually checked with the insurer, which is
        exactly the distinction the claim filer needs to see.
        """
        check = obj.eligibility_checks.order_by("-created_at").first()
        if not check:
            return "NOT_VERIFIED"
        return "ELIGIBLE" if check.is_eligible else "NOT_ELIGIBLE"

    def get_last_verified_at(self, obj):
        check = obj.eligibility_checks.order_by("-created_at").first()
        return check.created_at if check else None


class EligibilityCheckSerializer(serializers.ModelSerializer):
    checked_by_name = serializers.CharField(source="checked_by.get_full_name", read_only=True)

    class Meta:
        model = EligibilityCheck
        fields = [
            "id", "policy", "is_eligible", "scheme_returned", "member_status",
            "raw_response", "checked_by", "checked_by_name", "checked_at",
        ]
        read_only_fields = ["id", "checked_by", "checked_at"]


class ClaimItemSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    invoice_description = serializers.CharField(source="invoice.description", read_only=True)
    invoice_source_type = serializers.CharField(source="invoice.source_type", read_only=True)

    class Meta:
        model = ClaimItem
        fields = [
            "id", "claim", "invoice", "invoice_number", "invoice_description",
            "invoice_source_type", "benefit_code", "amount_claimed", "amount_approved",
        ]
        read_only_fields = ["id", "claim", "invoice", "amount_claimed"]


class InsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    insurer_name = serializers.CharField(source="policy.insurer.name", read_only=True)
    member_number = serializers.CharField(source="policy.member_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    items = ClaimItemSerializer(many=True, read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = [
            "id", "claim_number", "patient", "patient_name", "hospital_number", "policy",
            "insurer_name", "member_number", "visit", "status", "total_claimed", "total_approved",
            "gateway_reference", "submitted_at", "responded_at", "settled_at",
            "rejection_reason", "notes", "created_by", "created_by_name", "items", "created_at",
            "branch", "branch_name",
        ]
        read_only_fields = [
            "id", "claim_number", "created_by", "status", "total_claimed", "total_approved",
            "gateway_reference", "submitted_at", "responded_at", "settled_at", "branch",
        ]


class InsuranceClaimListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    insurer_name = serializers.CharField(source="policy.insurer.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)

    class Meta:
        model = InsuranceClaim
        fields = [
            "id", "claim_number", "patient_name", "insurer_name", "status",
            "total_claimed", "total_approved", "submitted_at", "created_at", "branch_name",
        ]
        

class CreateClaimSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    policy = serializers.UUIDField()
    invoice_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class ApplyResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED, ClaimStatus.REJECTED,
    ])
    approved_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")
    item_approvals = serializers.DictField(
        child=serializers.DecimalField(max_digits=10, decimal_places=2),
        required=False,
        help_text="Optional: {claim_item_id: approved_amount} for per-item approval.",
    )