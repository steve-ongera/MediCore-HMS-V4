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
    
    
    
from api.models import Visit  # add to the existing import block


class VisitListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_gender = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = [
            "id", "patient_name", "patient_gender", "visit_date",
            "department_name", "consultation_type", "created_at",
        ]

    def get_patient_name(self, obj):
        return getattr(obj.patient, "full_name", str(obj.patient)) if obj.patient_id else ""

    def get_patient_gender(self, obj):
        return getattr(obj.patient, "gender", "") if obj.patient_id else ""

    def get_department_name(self, obj):
        return getattr(obj.department, "name", "") if obj.department_id else ""
    
    

from api.models import ConsultationDiagnosis  # add to the existing import block


class ConsultationDiagnosisListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    consultation_date = serializers.SerializerMethodField()
    icd10_code_display = serializers.SerializerMethodField()
    diagnosis_description = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationDiagnosis
        fields = [
            "id", "patient_name", "consultation_date",
            "icd10_code_display", "diagnosis_description", "is_primary", "is_coding_verified",
        ]

    def get_patient_name(self, obj):
        patient = obj.consultation.visit.patient  # Consultation -> visit (OneToOne) -> patient
        return getattr(patient, "full_name", str(patient)) if patient else ""

    def get_consultation_date(self, obj):
        return obj.consultation.started_at

    def get_icd10_code_display(self, obj):
        return obj.icd10_code.code

    def get_diagnosis_description(self, obj):
        return obj.icd10_code.description
    
    
from medrecords.models import DeathRegister  # add to the existing import block


class DeathRegisterListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_gender = serializers.SerializerMethodField()
    certifying_doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = DeathRegister
        fields = [
            "id", "registration_number", "deceased_name", "patient_name", "patient_gender",
            "date_of_death", "cause_of_death", "certifying_doctor_name",
        ]

    def get_patient_name(self, obj):
        return getattr(obj.patient, "full_name", "") if obj.patient_id else ""

    def get_patient_gender(self, obj):
        return getattr(obj.patient, "gender", "") if obj.patient_id else ""

    def get_certifying_doctor_name(self, obj):
        return user_display(obj.certifying_doctor)