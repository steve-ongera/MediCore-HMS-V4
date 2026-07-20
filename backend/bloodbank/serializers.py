from rest_framework import serializers

from .models import BloodDonor, BloodDonation, BloodUnit, BloodRequest, BloodIssue


class BloodDonorSerializer(serializers.ModelSerializer):
    is_currently_eligible = serializers.BooleanField(read_only=True)

    class Meta:
        model = BloodDonor
        fields = [
            "id", "donor_number", "patient", "full_name", "national_id", "phone",
            "date_of_birth", "blood_group", "status", "deferral_reason",
            "deferred_until", "is_currently_eligible", "registered_by",
        ]
        read_only_fields = ["id", "donor_number", "registered_by"]


class BloodDonationSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source="donor.full_name", read_only=True)
    donor_blood_group = serializers.CharField(source="donor.blood_group", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True)

    class Meta:
        model = BloodDonation
        fields = [
            "id", "donation_number", "donor", "donor_name", "donor_blood_group",
            "donation_date", "volume_ml", "hemoglobin_level", "collected_by",
            "collected_by_name", "notes",
        ]
        read_only_fields = ["id", "donation_number", "donation_date", "collected_by"]


class BloodUnitSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source="donation.donor.full_name", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = BloodUnit
        fields = [
            "id", "unit_number", "donation", "donor_name", "blood_group", "component_type",
            "volume_ml", "collection_date", "expiry_date", "status", "screening_passed",
            "screening_notes", "unit_price", "is_expired", "days_until_expiry",
        ]
        read_only_fields = ["id", "unit_number", "expiry_date"]


class BloodIssueSerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source="unit.unit_number", read_only=True)
    unit_blood_group = serializers.CharField(source="unit.blood_group", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.get_full_name", read_only=True)

    class Meta:
        model = BloodIssue
        fields = [
            "id", "request", "unit", "unit_number", "unit_blood_group",
            "cross_match_compatible", "issued_by", "issued_by_name", "invoice", "issued_at", "notes",
        ]
        read_only_fields = ["id", "request", "issued_by", "invoice", "issued_at"]


class BloodRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    issues = BloodIssueSerializer(many=True, read_only=True)

    class Meta:
        model = BloodRequest
        fields = [
            "id", "request_number", "patient", "patient_name", "hospital_number",
            "patient_blood_group", "component_type", "units_requested", "priority",
            "clinical_indication", "status", "admission", "emergency_visit", "surgery",
            "delivery_record", "requested_by", "requested_by_name", "requested_at", "issues",
        ]
        read_only_fields = ["id", "request_number", "status", "requested_by", "requested_at"]


class BloodRequestListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = BloodRequest
        fields = [
            "id", "request_number", "patient_name", "patient_blood_group", "component_type",
            "units_requested", "priority", "status", "requested_at",
        ]


class CreateBloodRequestSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    patient_blood_group = serializers.ChoiceField(choices=["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    component_type = serializers.ChoiceField(choices=[
        "WHOLE_BLOOD", "PACKED_RED_CELLS", "PLATELETS", "FRESH_FROZEN_PLASMA", "CRYOPRECIPITATE",
    ])
    units_requested = serializers.IntegerField(min_value=1, default=1)
    priority = serializers.ChoiceField(choices=["EMERGENCY", "URGENT", "ROUTINE"], default="ROUTINE")
    clinical_indication = serializers.CharField(required=False, allow_blank=True, default="")
    admission = serializers.UUIDField(required=False, allow_null=True)
    emergency_visit = serializers.UUIDField(required=False, allow_null=True)
    surgery = serializers.UUIDField(required=False, allow_null=True)
    delivery_record = serializers.UUIDField(required=False, allow_null=True)


class IssueUnitSerializer(serializers.Serializer):
    unit = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class ScreenUnitSerializer(serializers.Serializer):
    screening_passed = serializers.BooleanField()
    screening_notes = serializers.CharField(required=False, allow_blank=True, default="")
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)