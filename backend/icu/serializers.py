from rest_framework import serializers

from .models import (
    ICUBed, ICUAdmission, ICUVitalsMonitoring, VentilatorSettings,
    ICUProcedureCatalog, ICUProcedureRecord, ICUBedCharge,
)


class ICUBedSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    current_patient = serializers.SerializerMethodField()

    class Meta:
        model = ICUBed
        fields = ["id", "bed_number", "unit_type", "daily_rate", "has_ventilator", "status", "is_active", "current_patient"]

    def get_current_patient(self, obj):
        a = obj.admissions.filter(status="ADMITTED").first()
        if not a:
            return None
        return {"icu_admission_id": str(a.id), "patient_name": a.patient.full_name}


class ICUProcedureCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = ICUProcedureCatalog
        fields = ["id", "code", "name", "price", "is_active"]


class ICUProcedureRecordSerializer(serializers.ModelSerializer):
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = ICUProcedureRecord
        fields = ["id", "icu_admission", "procedure", "procedure_name", "performed_by", "performed_by_name", "performed_at", "notes", "invoice"]
        read_only_fields = ["id", "icu_admission", "performed_by", "performed_at", "invoice"]


class ICUVitalsMonitoringSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = ICUVitalsMonitoring
        fields = [
            "id", "icu_admission", "recorded_at", "heart_rate", "bp_systolic", "bp_diastolic",
            "mean_arterial_pressure", "respiratory_rate", "oxygen_saturation", "temperature_c",
            "gcs_score", "urine_output_ml", "central_venous_pressure", "notes", "recorded_by", "recorded_by_name",
        ]
        read_only_fields = ["id", "icu_admission", "recorded_at", "recorded_by"]


class VentilatorSettingsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = VentilatorSettings
        fields = [
            "id", "icu_admission", "recorded_at", "mode", "fio2_percent", "peep_cmh2o",
            "tidal_volume_ml", "respiratory_rate_set", "peak_pressure", "notes",
            "recorded_by", "recorded_by_name",
        ]
        read_only_fields = ["id", "icu_admission", "recorded_at", "recorded_by"]


class ICUBedChargeSerializer(serializers.ModelSerializer):
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)

    class Meta:
        model = ICUBedCharge
        fields = ["id", "icu_admission", "bed", "bed_number", "charge_date", "amount", "invoice"]
        read_only_fields = ["id", "invoice"]


class ICUAdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    unit_type = serializers.CharField(source="bed.unit_type", read_only=True)
    attending_physician_name = serializers.CharField(source="attending_physician.get_full_name", read_only=True)
    length_of_stay_days = serializers.IntegerField(read_only=True)

    vitals = ICUVitalsMonitoringSerializer(many=True, read_only=True)
    ventilator_settings = VentilatorSettingsSerializer(many=True, read_only=True)
    procedures = ICUProcedureRecordSerializer(many=True, read_only=True)
    bed_charges = ICUBedChargeSerializer(many=True, read_only=True)

    class Meta:
        model = ICUAdmission
        fields = [
            "id", "icu_admission_number", "patient", "patient_name", "hospital_number",
            "ward_admission", "bed", "bed_number", "unit_type", "admission_reason",
            "admission_diagnosis", "severity_score", "attending_physician", "attending_physician_name",
            "status", "admitted_at", "discharged_at", "discharge_summary", "length_of_stay_days",
            "vitals", "ventilator_settings", "procedures", "bed_charges",
        ]
        read_only_fields = ["id", "icu_admission_number", "status", "admitted_at", "discharged_at"]


class ICUAdmissionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    unit_type = serializers.CharField(source="bed.unit_type", read_only=True)
    length_of_stay_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = ICUAdmission
        fields = ["id", "icu_admission_number", "patient_name", "bed_number", "unit_type", "admission_reason", "severity_score", "status", "admitted_at", "length_of_stay_days"]


class AdmitToICUSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    ward_admission = serializers.UUIDField(required=False, allow_null=True)
    bed = serializers.UUIDField()
    admission_reason = serializers.ChoiceField(choices=[
        "RESPIRATORY_FAILURE", "SEPSIS", "POST_SURGICAL", "TRAUMA", "CARDIAC", "NEUROLOGICAL", "OTHER",
    ])
    admission_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    severity_score = serializers.IntegerField(required=False, allow_null=True)
    attending_physician = serializers.UUIDField(required=False, allow_null=True)


class DischargeICUSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["STEPPED_DOWN", "DISCHARGED_HOME", "DECEASED", "TRANSFERRED_OUT"])
    discharge_summary = serializers.CharField(required=False, allow_blank=True, default="")


class OrderICUProcedureSerializer(serializers.Serializer):
    procedure = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")