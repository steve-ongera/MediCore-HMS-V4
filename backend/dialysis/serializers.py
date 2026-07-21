from rest_framework import serializers

from .models import DialysisMachine, DialysisPatientProfile, DialysisSession, VascularAccessCheck


class DialysisMachineSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    active_session = serializers.SerializerMethodField()

    class Meta:
        model = DialysisMachine
        fields = ["id", "machine_number", "make_model", "rate_per_session", "status", "is_active", "active_session"]

    def get_active_session(self, obj):
        s = obj.sessions.filter(status="IN_PROGRESS").first()
        if not s:
            return None
        return {"session_id": str(s.id), "patient_name": s.profile.patient.full_name}


class VascularAccessCheckSerializer(serializers.ModelSerializer):
    checked_by_name = serializers.CharField(source="checked_by.get_full_name", read_only=True)

    class Meta:
        model = VascularAccessCheck
        fields = [
            "id", "profile", "check_date", "thrill_present", "bruit_present",
            "signs_of_infection", "signs_of_stenosis", "notes", "checked_by", "checked_by_name",
        ]
        read_only_fields = ["id", "profile", "checked_by"]


class DialysisSessionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="profile.patient.full_name", read_only=True)
    machine_number = serializers.CharField(source="machine.machine_number", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)
    fluid_removed_kg = serializers.SerializerMethodField()

    class Meta:
        model = DialysisSession
        fields = [
            "id", "session_number", "profile", "patient_name", "machine", "machine_number",
            "scheduled_date", "status", "started_at", "ended_at", "pre_weight_kg", "post_weight_kg",
            "fluid_removed_kg", "pre_bp_systolic", "pre_bp_diastolic", "post_bp_systolic", "post_bp_diastolic",
            "ultrafiltration_target_ml", "blood_flow_rate", "dialysate_flow_rate",
            "complications", "nursing_notes", "performed_by", "performed_by_name", "invoice",
        ]
        read_only_fields = ["id", "session_number", "status", "started_at", "ended_at", "performed_by", "invoice"]

    def get_fluid_removed_kg(self, obj):
        val = obj.fluid_removed_kg
        return str(val) if val is not None else None


class DialysisSessionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="profile.patient.full_name", read_only=True)
    machine_number = serializers.CharField(source="machine.machine_number", read_only=True)

    class Meta:
        model = DialysisSession
        fields = ["id", "session_number", "patient_name", "machine_number", "scheduled_date", "status"]


class DialysisPatientProfileSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    nephrologist_name = serializers.CharField(source="nephrologist.get_full_name", read_only=True)
    sessions = DialysisSessionListSerializer(many=True, read_only=True)
    access_checks = VascularAccessCheckSerializer(many=True, read_only=True)

    class Meta:
        model = DialysisPatientProfile
        fields = [
            "id", "profile_number", "patient", "patient_name", "hospital_number",
            "primary_diagnosis", "dry_weight_kg", "vascular_access_type", "access_site_notes",
            "sessions_per_week", "session_duration_hours", "dialyzer_type", "anticoagulation_protocol",
            "status", "nephrologist", "nephrologist_name", "started_on", "registered_by",
            "sessions", "access_checks",
        ]
        read_only_fields = ["id", "profile_number", "registered_by"]


class DialysisPatientProfileListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)

    class Meta:
        model = DialysisPatientProfile
        fields = ["id", "profile_number", "patient_name", "hospital_number", "vascular_access_type", "status", "sessions_per_week"]


class RegisterDialysisPatientSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    primary_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    dry_weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    vascular_access_type = serializers.ChoiceField(choices=["AV_FISTULA", "AV_GRAFT", "CENTRAL_CATHETER", "PERITONEAL"])
    access_site_notes = serializers.CharField(required=False, allow_blank=True, default="")
    sessions_per_week = serializers.IntegerField(default=3)
    session_duration_hours = serializers.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    dialyzer_type = serializers.CharField(required=False, allow_blank=True, default="")
    anticoagulation_protocol = serializers.CharField(required=False, allow_blank=True, default="")
    nephrologist = serializers.UUIDField(required=False, allow_null=True)
    started_on = serializers.DateField()


class ScheduleSessionSerializer(serializers.Serializer):
    machine = serializers.UUIDField(required=False, allow_null=True)
    scheduled_date = serializers.DateTimeField()


class StartSessionSerializer(serializers.Serializer):
    machine = serializers.UUIDField()
    pre_weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    pre_bp_systolic = serializers.IntegerField(required=False, allow_null=True)
    pre_bp_diastolic = serializers.IntegerField(required=False, allow_null=True)
    ultrafiltration_target_ml = serializers.IntegerField(required=False, allow_null=True)
    blood_flow_rate = serializers.IntegerField(required=False, allow_null=True)
    dialysate_flow_rate = serializers.IntegerField(required=False, allow_null=True)


class CompleteSessionSerializer(serializers.Serializer):
    post_weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    post_bp_systolic = serializers.IntegerField(required=False, allow_null=True)
    post_bp_diastolic = serializers.IntegerField(required=False, allow_null=True)
    complications = serializers.CharField(required=False, allow_blank=True, default="")
    nursing_notes = serializers.CharField(required=False, allow_blank=True, default="")