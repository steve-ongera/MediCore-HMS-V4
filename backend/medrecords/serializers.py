from rest_framework import serializers
from .models import (
    PatientFile, FileMovement, DocumentAttachment, BirthRegister, DeathRegister,
    Referral, DischargeSummary, RecordRequest, RecordAuditTrail,
)
from api.models import ConsultationDiagnosis



class FileMovementSerializer(serializers.ModelSerializer):
    from_custodian_name = serializers.CharField(source="from_custodian.get_full_name", read_only=True)
    to_custodian_name = serializers.CharField(source="to_custodian.get_full_name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = FileMovement
        fields = ["id", "patient_file", "action", "from_custodian", "from_custodian_name", "to_custodian", "to_custodian_name", "location", "reason", "recorded_by", "recorded_by_name", "moved_at"]
        read_only_fields = ["id", "patient_file", "recorded_by", "moved_at"]


class PatientFileSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    current_custodian_name = serializers.CharField(source="current_custodian.get_full_name", read_only=True)
    movements = FileMovementSerializer(many=True, read_only=True)

    class Meta:
        model = PatientFile
        fields = ["id", "file_number", "patient", "patient_name", "hospital_number", "status", "current_custodian", "current_custodian_name", "current_location", "checked_out_at", "expected_return_at", "movements"]
        read_only_fields = ["id", "file_number", "status", "current_custodian", "checked_out_at"]


class PatientFileListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    current_custodian_name = serializers.CharField(source="current_custodian.get_full_name", read_only=True)

    class Meta:
        model = PatientFile
        fields = ["id", "file_number", "patient_name", "status", "current_custodian_name", "current_location", "checked_out_at"]


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = DocumentAttachment
        fields = ["id", "patient", "document_type", "title", "file", "description", "uploaded_by", "uploaded_by_name", "uploaded_at"]
        read_only_fields = ["id", "uploaded_by", "uploaded_at"]


class BirthRegisterSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="mother.full_name", read_only=True)
    attending_staff_name = serializers.CharField(source="attending_staff.get_full_name", read_only=True)
    registered_by_name = serializers.CharField(source="registered_by.get_full_name", read_only=True)

    class Meta:
        model = BirthRegister
        fields = ["id", "registration_number", "child_name", "sex", "date_of_birth", "time_of_birth", "place_of_birth", "mother", "mother_name", "father_name", "father_national_id", "mch_child", "attending_staff", "attending_staff_name", "registered_by", "registered_by_name", "registered_at"]
        read_only_fields = ["id", "registration_number", "registered_by", "registered_at"]


class DeathRegisterSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    certifying_doctor_name = serializers.CharField(source="certifying_doctor.get_full_name", read_only=True)
    registered_by_name = serializers.CharField(source="registered_by.get_full_name", read_only=True)

    class Meta:
        model = DeathRegister
        fields = ["id", "registration_number", "deceased_name", "patient", "patient_name", "date_of_death", "cause_of_death", "certifying_doctor", "certifying_doctor_name", "mortuary_case", "registered_by", "registered_by_name", "registered_at"]
        read_only_fields = ["id", "registration_number", "registered_by", "registered_at"]


class ReferralSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    receiving_doctor_name = serializers.CharField(source="receiving_doctor.get_full_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Referral
        fields = ["id", "referral_number", "patient", "patient_name", "hospital_number", "direction", "facility_name", "facility_contact", "reason", "clinical_summary", "status", "referring_doctor", "receiving_doctor", "receiving_doctor_name", "created_by", "created_by_name", "created_at_display", "resolved_at"]
        read_only_fields = ["id", "referral_number", "status", "created_by", "created_at_display", "resolved_at"]


class DischargeSummarySerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source="admission.admission_number", read_only=True)
    patient_name = serializers.CharField(source="admission.patient.full_name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.get_full_name", read_only=True)

    class Meta:
        model = DischargeSummary
        fields = [
            "id", "admission", "admission_number", "patient_name", "diagnosis_on_admission", "diagnosis_on_discharge",
            "procedures_performed", "treatment_summary", "condition_on_discharge", "discharge_medications",
            "followup_instructions", "is_complete", "completed_by", "completed_by_name", "completed_at", "created_by",
        ]
        read_only_fields = ["id", "is_complete", "completed_by", "completed_at", "created_by"]


class RecordRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = RecordRequest
        fields = ["id", "request_number", "patient", "patient_name", "hospital_number", "requested_by", "requested_by_name", "purpose", "purpose_details", "status", "reviewed_by", "reviewed_by_name", "reviewed_at", "denial_reason", "fulfilled_at", "requested_at"]
        read_only_fields = ["id", "request_number", "requested_by", "status", "reviewed_by", "reviewed_at", "denial_reason", "fulfilled_at", "requested_at"]


class RecordAuditTrailSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = RecordAuditTrail
        fields = ["id", "patient", "patient_name", "action", "performed_by", "performed_by_name", "detail", "ip_address", "occurred_at"]
        read_only_fields = fields


class CheckoutFileSerializer(serializers.Serializer):
    to_custodian = serializers.UUIDField()
    location = serializers.CharField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(required=False, allow_blank=True, default="")
    expected_return_at = serializers.DateTimeField(required=False, allow_null=True)


class DenyRequestSerializer(serializers.Serializer):
    denial_reason = serializers.CharField()
    
    


class ConsultationDiagnosisSerializer(serializers.ModelSerializer):
    icd10_code_display = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    consultation_id = serializers.UUIDField(source="consultation.id", read_only=True)

    class Meta:
        model = ConsultationDiagnosis
        fields = [
            "id", "consultation", "consultation_id", "icd10_code", "icd10_code_display",
            "notes", "is_coding_verified", "coding_verified_by", "coding_verified_at",
            "coding_correction_notes", "doctor_name", "patient_name",
        ]
        read_only_fields = [
            "id", "is_coding_verified", "coding_verified_by", "coding_verified_at",
        ]

    def get_icd10_code_display(self, obj):
        try:
            if obj.icd10_code:
                return f"{obj.icd10_code.code} - {obj.icd10_code.description}"
        except AttributeError:
            pass
        return None

    def get_doctor_name(self, obj):
        try:
            return obj.consultation.doctor.get_full_name()
        except AttributeError:
            return None

    def get_patient_name(self, obj):
        try:
            return obj.consultation.visit.patient.full_name
        except AttributeError:
            return None