from rest_framework import serializers

from .models import DentalProcedureCatalog, DentalVisit, ToothChart, DentalTreatmentPlan, DentalProcedureRecord


class DentalProcedureCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = DentalProcedureCatalog
        fields = ["id", "code", "name", "price", "is_active"]


class ToothChartSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = ToothChart
        fields = ["id", "dental_visit", "tooth_number", "condition", "notes", "recorded_by", "recorded_by_name"]
        read_only_fields = ["id", "dental_visit", "recorded_by"]


class DentalProcedureRecordSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = DentalProcedureRecord
        fields = ["id", "treatment_plan", "performed_by", "performed_by_name", "performed_at", "notes", "invoice"]
        read_only_fields = ["id", "treatment_plan", "performed_by", "performed_at", "invoice"]


class DentalTreatmentPlanSerializer(serializers.ModelSerializer):
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    procedure_price = serializers.DecimalField(source="procedure.price", max_digits=10, decimal_places=2, read_only=True)
    planned_by_name = serializers.CharField(source="planned_by.get_full_name", read_only=True)
    procedure_record = DentalProcedureRecordSerializer(read_only=True)

    class Meta:
        model = DentalTreatmentPlan
        fields = [
            "id", "dental_visit", "tooth_number", "procedure", "procedure_name", "procedure_price",
            "sequence", "status", "notes", "planned_by", "planned_by_name", "procedure_record",
        ]
        read_only_fields = ["id", "dental_visit", "status", "planned_by"]


class DentalVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    dentist_name = serializers.CharField(source="dentist.get_full_name", read_only=True)
    tooth_chart = ToothChartSerializer(many=True, read_only=True)
    treatment_plans = DentalTreatmentPlanSerializer(many=True, read_only=True)

    class Meta:
        model = DentalVisit
        fields = [
            "id", "visit_number", "patient", "patient_name", "hospital_number", "visit",
            "dentist", "dentist_name", "chief_complaint", "clinical_notes",
            "registered_by", "visit_date", "tooth_chart", "treatment_plans",
        ]
        read_only_fields = ["id", "visit_number", "visit", "registered_by", "visit_date"]


class DentalVisitListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.get_full_name", read_only=True)

    class Meta:
        model = DentalVisit
        fields = ["id", "visit_number", "patient_name", "dentist_name", "chief_complaint", "visit_date"]


class RegisterDentalVisitSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    dentist = serializers.UUIDField(required=False, allow_null=True)
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default="")


class RecordToothSerializer(serializers.Serializer):
    tooth_number = serializers.CharField()
    condition = serializers.ChoiceField(choices=[
        "HEALTHY", "CARIES", "FILLED", "CROWNED", "MISSING", "IMPACTED", "FRACTURED", "ROOT_CANAL_TREATED",
    ])
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AddTreatmentPlanSerializer(serializers.Serializer):
    tooth_number = serializers.CharField(required=False, allow_blank=True, default="")
    procedure = serializers.UUIDField()
    sequence = serializers.IntegerField(default=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PerformProcedureSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")