# licensing/serializers.py
from rest_framework import serializers
from .models import FacilityLicense


class FacilityLicenseSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    current_bed_count = serializers.IntegerField(read_only=True, allow_null=True)
    current_user_count = serializers.IntegerField(read_only=True)
    current_patient_count = serializers.IntegerField(read_only=True)
    beds_remaining = serializers.IntegerField(read_only=True, allow_null=True)
    users_remaining = serializers.IntegerField(read_only=True)
    patients_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = FacilityLicense
        fields = [
            "id", "package", "license_key", "max_beds", "max_users", "max_patients", "licensed_to",
            "valid_from", "valid_until", "is_active", "notes", "is_expired",
            "current_bed_count", "current_user_count", "current_patient_count",
            "beds_remaining", "users_remaining", "patients_remaining",
            "updated_at_display",
        ]
        read_only_fields = fields


class FacilityLicenseAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityLicense
        fields = [
            "package", "license_key", "max_beds", "max_users", "max_patients", "licensed_to",
            "valid_from", "valid_until", "is_active", "notes",
        ]