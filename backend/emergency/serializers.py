from rest_framework import serializers

from .models import (
    EmergencyBay, EmergencyVisit, TriageVitals, EmergencyNote,
    EmergencyProcedureCatalog, EmergencyProcedure,
    EmergencyMedicationOrder, EmergencyMedicationAdministration,
    EmergencyBayCharge,
)


class EmergencyBaySerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    current_patient = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyBay
        fields = ["id", "bay_number", "zone", "hourly_rate", "status", "is_active", "current_patient"]

    def get_current_patient(self, obj):
        ev = obj.emergency_visits.filter(status="IN_ED").first()
        if not ev:
            return None
        return {"emergency_visit_id": str(ev.id), "patient_name": ev.patient.full_name}


class TriageVitalsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = TriageVitals
        fields = [
            "id", "emergency_visit", "weight_kg", "temperature_c", "pulse_bpm",
            "respiratory_rate", "bp_systolic", "bp_diastolic", "oxygen_saturation",
            "gcs_score", "pain_score", "recorded_by", "recorded_by_name", "recorded_at",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_at"]


class EmergencyNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = EmergencyNote
        fields = ["id", "emergency_visit", "author", "author_name", "note", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class EmergencyProcedureCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = EmergencyProcedureCatalog
        fields = ["id", "code", "name", "price", "is_active"]


class EmergencyProcedureSerializer(serializers.ModelSerializer):
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    procedure_price = serializers.DecimalField(source="procedure.price", max_digits=10, decimal_places=2, read_only=True)
    ordered_by_name = serializers.CharField(source="ordered_by.get_full_name", read_only=True)

    class Meta:
        model = EmergencyProcedure
        fields = [
            "id", "emergency_visit", "procedure", "procedure_name", "procedure_price",
            "status", "notes", "ordered_by", "ordered_by_name", "performed_by",
            "invoice", "ordered_at", "completed_at",
        ]
        read_only_fields = ["id", "ordered_by", "invoice", "ordered_at", "completed_at"]


class EmergencyMedicationOrderSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    ordered_by_name = serializers.CharField(source="ordered_by.get_full_name", read_only=True)

    class Meta:
        model = EmergencyMedicationOrder
        fields = [
            "id", "emergency_visit", "medicine", "medicine_name", "dosage", "route",
            "quantity", "is_active", "ordered_by", "ordered_by_name", "ordered_at",
        ]
        read_only_fields = ["id", "ordered_by", "ordered_at"]


class EmergencyMedicationAdministrationSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medication_order.medicine.name", read_only=True)
    administered_by_name = serializers.CharField(source="administered_by.get_full_name", read_only=True)

    class Meta:
        model = EmergencyMedicationAdministration
        fields = [
            "id", "medication_order", "medicine_name", "administered_by", "administered_by_name",
            "status", "batch", "invoice", "administered_at",
        ]
        read_only_fields = ["id", "administered_by", "batch", "invoice", "administered_at"]


class EmergencyBayChargeSerializer(serializers.ModelSerializer):
    bay_number = serializers.CharField(source="bay.bay_number", read_only=True)

    class Meta:
        model = EmergencyBayCharge
        fields = ["id", "emergency_visit", "bay", "bay_number", "hours_charged", "amount", "invoice", "charged_at"]
        read_only_fields = ["id", "invoice", "charged_at"]


class EmergencyVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    bay_number = serializers.CharField(source="bay.bay_number", read_only=True)
    attending_doctor_name = serializers.CharField(source="attending_doctor.get_full_name", read_only=True)
    duration_hours = serializers.SerializerMethodField()

    vitals = TriageVitalsSerializer(many=True, read_only=True)
    notes = EmergencyNoteSerializer(many=True, read_only=True)
    procedures = EmergencyProcedureSerializer(many=True, read_only=True)
    medication_orders = EmergencyMedicationOrderSerializer(many=True, read_only=True)
    bay_charges = EmergencyBayChargeSerializer(many=True, read_only=True)

    class Meta:
        model = EmergencyVisit
        fields = [
            "id", "visit_number", "patient", "patient_name", "hospital_number", "visit",
            "bay", "bay_number", "triage_level", "arrival_mode", "chief_complaint",
            "attending_doctor", "attending_doctor_name", "registered_by", "status",
            "arrived_at", "disposition_at", "disposition_notes", "admission", "duration_hours",
            "vitals", "notes", "procedures", "medication_orders", "bay_charges",
        ]
        read_only_fields = [
            "id", "visit_number", "registered_by", "status", "arrived_at",
            "disposition_at", "admission",
        ]

    def get_duration_hours(self, obj):
        return round(obj.duration_hours, 2)


class EmergencyVisitListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    bay_number = serializers.CharField(source="bay.bay_number", read_only=True)
    duration_hours = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyVisit
        fields = [
            "id", "visit_number", "patient_name", "hospital_number", "bay_number",
            "triage_level", "arrival_mode", "status", "arrived_at", "duration_hours",
        ]

    def get_duration_hours(self, obj):
        return round(obj.duration_hours, 2)


class RegisterEmergencySerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    bay = serializers.UUIDField(required=False, allow_null=True)
    triage_level = serializers.ChoiceField(choices=[1, 2, 3, 4, 5], required=False, allow_null=True)
    arrival_mode = serializers.ChoiceField(choices=["WALK_IN", "AMBULANCE", "POLICE", "REFERRAL", "OTHER"], default="WALK_IN")
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default="")
    attending_doctor = serializers.UUIDField(required=False, allow_null=True)


class DischargeHomeSerializer(serializers.Serializer):
    disposition_notes = serializers.CharField(required=False, allow_blank=True, default="")


class TransferToAdmissionSerializer(serializers.Serializer):
    bed = serializers.UUIDField()
    admitting_doctor = serializers.UUIDField()
    attending_doctor = serializers.UUIDField(required=False, allow_null=True)
    admission_type = serializers.ChoiceField(choices=["EMERGENCY", "ELECTIVE", "TRANSFER_IN", "MATERNITY"], default="EMERGENCY")
    admission_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    disposition_notes = serializers.CharField(required=False, allow_blank=True, default="")


class LamaSerializer(serializers.Serializer):
    disposition_notes = serializers.CharField(required=False, allow_blank=True, default="")


class DeceasedSerializer(serializers.Serializer):
    disposition_notes = serializers.CharField(required=False, allow_blank=True, default="")


class OrderEmergencyProcedureSerializer(serializers.Serializer):
    procedure = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AddEmergencyChargeSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)