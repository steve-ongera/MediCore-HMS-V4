from rest_framework import serializers

from .models import (
    EyeProcedureCatalog, EyeVisit, EyeExamination, SpectaclePrescription,
    EyeTreatmentPlan, EyeProcedureRecord,
)


class EyeProcedureCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = EyeProcedureCatalog
        fields = ["id", "code", "name", "price", "is_active"]


class EyeExaminationSerializer(serializers.ModelSerializer):
    examined_by_name = serializers.CharField(source="examined_by.get_full_name", read_only=True)

    class Meta:
        model = EyeExamination
        fields = [
            "id", "eye_visit", "visual_acuity_od", "visual_acuity_os", "iop_od", "iop_os",
            "sphere_od", "cylinder_od", "axis_od", "sphere_os", "cylinder_os", "axis_os",
            "anterior_segment_notes", "posterior_segment_notes", "diagnosis",
            "examined_by", "examined_by_name", "examined_at",
        ]
        read_only_fields = ["id", "eye_visit", "examined_by", "examined_at"]


class SpectaclePrescriptionSerializer(serializers.ModelSerializer):
    prescribed_by_name = serializers.CharField(source="prescribed_by.get_full_name", read_only=True)

    class Meta:
        model = SpectaclePrescription
        fields = [
            "id", "eye_visit", "lens_type", "sphere_od", "cylinder_od", "axis_od", "add_od",
            "sphere_os", "cylinder_os", "axis_os", "add_os", "pupillary_distance_mm",
            "price", "notes", "prescribed_by", "prescribed_by_name", "invoice", "prescribed_at",
        ]
        read_only_fields = ["id", "eye_visit", "prescribed_by", "invoice", "prescribed_at"]


class EyeProcedureRecordSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = EyeProcedureRecord
        fields = ["id", "treatment_plan", "performed_by", "performed_by_name", "performed_at", "notes", "invoice"]
        read_only_fields = ["id", "treatment_plan", "performed_by", "performed_at", "invoice"]


class EyeTreatmentPlanSerializer(serializers.ModelSerializer):
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    procedure_price = serializers.DecimalField(source="procedure.price", max_digits=10, decimal_places=2, read_only=True)
    planned_by_name = serializers.CharField(source="planned_by.get_full_name", read_only=True)
    procedure_record = EyeProcedureRecordSerializer(read_only=True)

    class Meta:
        model = EyeTreatmentPlan
        fields = [
            "id", "eye_visit", "procedure", "procedure_name", "procedure_price", "eye",
            "status", "notes", "planned_by", "planned_by_name", "procedure_record",
        ]
        read_only_fields = ["id", "eye_visit", "status", "planned_by"]


class EyeVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    ophthalmologist_name = serializers.CharField(source="ophthalmologist.get_full_name", read_only=True)
    examination = EyeExaminationSerializer(read_only=True)
    spectacle_prescriptions = SpectaclePrescriptionSerializer(many=True, read_only=True)
    treatment_plans = EyeTreatmentPlanSerializer(many=True, read_only=True)

    class Meta:
        model = EyeVisit
        fields = [
            "id", "visit_number", "patient", "patient_name", "hospital_number", "visit",
            "ophthalmologist", "ophthalmologist_name", "chief_complaint", "clinical_notes",
            "registered_by", "visit_date", "examination", "spectacle_prescriptions", "treatment_plans",
        ]
        read_only_fields = ["id", "visit_number", "visit", "registered_by", "visit_date"]


class EyeVisitListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    ophthalmologist_name = serializers.CharField(source="ophthalmologist.get_full_name", read_only=True)

    class Meta:
        model = EyeVisit
        fields = ["id", "visit_number", "patient_name", "ophthalmologist_name", "chief_complaint", "visit_date"]


class RegisterEyeVisitSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    ophthalmologist = serializers.UUIDField(required=False, allow_null=True)
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default="")


class SaveExaminationSerializer(serializers.Serializer):
    visual_acuity_od = serializers.CharField(required=False, allow_blank=True, default="")
    visual_acuity_os = serializers.CharField(required=False, allow_blank=True, default="")
    iop_od = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    iop_os = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    sphere_od = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    cylinder_od = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    axis_od = serializers.IntegerField(required=False, allow_null=True)
    sphere_os = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    cylinder_os = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    axis_os = serializers.IntegerField(required=False, allow_null=True)
    anterior_segment_notes = serializers.CharField(required=False, allow_blank=True, default="")
    posterior_segment_notes = serializers.CharField(required=False, allow_blank=True, default="")
    diagnosis = serializers.CharField(required=False, allow_blank=True, default="")


class CreateSpectaclePrescriptionSerializer(serializers.Serializer):
    lens_type = serializers.ChoiceField(choices=["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE", "READING"])
    sphere_od = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    cylinder_od = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    axis_od = serializers.IntegerField(required=False, allow_null=True)
    add_od = serializers.DecimalField(max_digits=4, decimal_places=2, required=False, allow_null=True)
    sphere_os = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    cylinder_os = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    axis_os = serializers.IntegerField(required=False, allow_null=True)
    add_os = serializers.DecimalField(max_digits=4, decimal_places=2, required=False, allow_null=True)
    pupillary_distance_mm = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AddEyeTreatmentPlanSerializer(serializers.Serializer):
    procedure = serializers.UUIDField()
    eye = serializers.ChoiceField(choices=["OD", "OS", "BOTH"], default="BOTH")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PerformEyeProcedureSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")