from rest_framework import serializers

from .models import (
    OperatingTheatre, SurgicalProcedureCatalog, SurgeryBooking, Surgery,
    SurgicalTeamMember, ConsumableUsage, PostOpNote,
)


class OperatingTheatreSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    active_surgery = serializers.SerializerMethodField()

    class Meta:
        model = OperatingTheatre
        fields = ["id", "theatre_number", "hourly_rate", "status", "is_active", "active_surgery"]

    def get_active_surgery(self, obj):
        s = obj.surgeries.filter(status="IN_PROGRESS").first()
        if not s:
            return None
        return {"surgery_id": str(s.id), "patient_name": s.booking.patient.full_name, "procedure": s.booking.procedure.name}


class SurgicalProcedureCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = SurgicalProcedureCatalog
        fields = ["id", "code", "name", "base_price", "estimated_duration_minutes", "is_active"]


class SurgicalTeamMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = SurgicalTeamMember
        fields = ["id", "surgery", "user", "user_name", "role", "fee"]
        read_only_fields = ["id", "surgery"]


class ConsumableUsageSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = ConsumableUsage
        fields = ["id", "surgery", "medicine", "medicine_name", "batch", "quantity", "invoice", "recorded_by", "recorded_at"]
        read_only_fields = ["id", "surgery", "batch", "invoice", "recorded_by", "recorded_at"]


class PostOpNoteSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = PostOpNote
        fields = [
            "id", "surgery", "recorded_by", "recorded_by_name", "bp_systolic", "bp_diastolic",
            "pulse_bpm", "oxygen_saturation", "consciousness_level", "pain_score", "notes", "recorded_at",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_at"]


class SurgerySerializer(serializers.ModelSerializer):
    theatre_number = serializers.CharField(source="theatre.theatre_number", read_only=True)
    patient_name = serializers.CharField(source="booking.patient.full_name", read_only=True)
    procedure_name = serializers.CharField(source="booking.procedure.name", read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    team = SurgicalTeamMemberSerializer(many=True, read_only=True)
    consumables_used = ConsumableUsageSerializer(many=True, read_only=True)
    post_op_notes = PostOpNoteSerializer(many=True, read_only=True)

    class Meta:
        model = Surgery
        fields = [
            "id", "booking", "theatre", "theatre_number", "patient_name", "procedure_name",
            "theatre_in_at", "incision_at", "closure_at", "theatre_out_at", "status", "outcome",
            "operative_notes", "complications", "estimated_blood_loss_ml", "invoice",
            "duration_hours", "team", "consumables_used", "post_op_notes",
        ]
        read_only_fields = ["id", "booking", "theatre", "theatre_in_at", "status", "invoice"]


class SurgeryBookingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    procedure_price = serializers.DecimalField(source="procedure.base_price", max_digits=12, decimal_places=2, read_only=True)
    theatre_number = serializers.CharField(source="theatre.theatre_number", read_only=True)
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.get_full_name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    surgery = SurgerySerializer(read_only=True)

    class Meta:
        model = SurgeryBooking
        fields = [
            "id", "booking_number", "patient", "patient_name", "hospital_number", "procedure",
            "procedure_name", "procedure_price", "priority", "status", "requested_date",
            "theatre", "theatre_number", "primary_surgeon", "primary_surgeon_name",
            "diagnosis", "pre_op_notes", "admission", "emergency_visit",
            "requested_by", "requested_by_name", "cancellation_reason", "surgery", "created_at",
        ]
        read_only_fields = ["id", "booking_number", "status", "requested_by", "cancellation_reason", "created_at"]


class SurgeryBookingListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    theatre_number = serializers.CharField(source="theatre.theatre_number", read_only=True)
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.get_full_name", read_only=True)

    class Meta:
        model = SurgeryBooking
        fields = [
            "id", "booking_number", "patient_name", "procedure_name", "priority", "status",
            "requested_date", "theatre_number", "primary_surgeon_name",
        ]


class CreateBookingSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    procedure = serializers.UUIDField()
    priority = serializers.ChoiceField(choices=["EMERGENCY", "URGENT", "ELECTIVE"], default="ELECTIVE")
    requested_date = serializers.DateTimeField()
    theatre = serializers.UUIDField(required=False, allow_null=True)
    primary_surgeon = serializers.UUIDField(required=False, allow_null=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    pre_op_notes = serializers.CharField(required=False, allow_blank=True, default="")
    admission = serializers.UUIDField(required=False, allow_null=True)
    emergency_visit = serializers.UUIDField(required=False, allow_null=True)


class CancelBookingSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField()


class StartSurgerySerializer(serializers.Serializer):
    theatre = serializers.UUIDField()


class UpdateSurgeryTimestampSerializer(serializers.Serializer):
    pass  # timestamps are simply set server-side on action call


class CompleteSurgerySerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=["SUCCESSFUL", "COMPLICATIONS", "DECEASED"])
    operative_notes = serializers.CharField(required=False, allow_blank=True, default="")
    complications = serializers.CharField(required=False, allow_blank=True, default="")
    estimated_blood_loss_ml = serializers.IntegerField(required=False, allow_null=True)


class AssignTeamMemberSerializer(serializers.Serializer):
    user = serializers.UUIDField()
    role = serializers.ChoiceField(choices=[
        "PRIMARY_SURGEON", "ASSISTANT_SURGEON", "ANESTHETIST",
        "SCRUB_NURSE", "CIRCULATING_NURSE", "OTHER",
    ])
    fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)


class RecordConsumableSerializer(serializers.Serializer):
    medicine = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)