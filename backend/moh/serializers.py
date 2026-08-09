from rest_framework import serializers

from inpatient.models import Admission


def user_display(user):
    if not user:
        return ""
    return getattr(user, "full_name", None) or getattr(user, "get_full_name", lambda: "")() or str(user)


class AdmissionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    ward = serializers.SerializerMethodField()
    bed_number = serializers.SerializerMethodField()
    admitted_by_name = serializers.SerializerMethodField()
    admitting_doctor_name = serializers.SerializerMethodField()
    attending_doctor_name = serializers.SerializerMethodField()
    length_of_stay_days = serializers.ReadOnlyField()  # Admission.length_of_stay_days is a model @property

    class Meta:
        model = Admission
        fields = [
            "id", "admission_number", "patient_name", "admission_date", "admission_type",
            "admission_diagnosis", "ward", "bed_number", "admitted_by_name",
            "admitting_doctor_name", "attending_doctor_name", "status",
            "discharge_date", "discharge_type", "expected_discharge_date",
            "length_of_stay_days", "created_at",
        ]

    def get_patient_name(self, obj):
        return getattr(obj.patient, "full_name", str(obj.patient)) if obj.patient_id else ""

    def get_ward(self, obj):
        ward = getattr(obj.bed, "ward", None) if obj.bed_id else None
        return getattr(ward, "name", "") if ward else ""

    def get_bed_number(self, obj):
        return getattr(obj.bed, "bed_number", "") if obj.bed_id else ""

    def get_admitted_by_name(self, obj):
        return user_display(obj.admitted_by)

    def get_admitting_doctor_name(self, obj):
        return user_display(obj.admitting_doctor)

    def get_attending_doctor_name(self, obj):
        return user_display(obj.attending_doctor)