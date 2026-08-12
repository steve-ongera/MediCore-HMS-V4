from rest_framework import serializers
from .models import CarePlan, FollowUpTask, CareMilestone, ChronicMonitoringReading


class ChronicMonitoringReadingSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = ChronicMonitoringReading
        fields = ["id", "care_plan", "metric_name", "value", "unit", "recorded_by", "recorded_by_name", "recorded_at", "follow_up_task"]
        read_only_fields = ["id", "care_plan", "recorded_by", "recorded_at"]


class CareMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareMilestone
        fields = ["id", "care_plan", "description", "target_date", "is_achieved", "achieved_at", "notes"]
        read_only_fields = ["id", "care_plan", "achieved_at"]


class FollowUpTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    assigned_department_name = serializers.CharField(source="assigned_department.name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.get_full_name", read_only=True)
    patient_name = serializers.CharField(source="care_plan.patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="care_plan.patient.hospital_number", read_only=True)
    care_plan_title = serializers.CharField(source="care_plan.title", read_only=True)

    class Meta:
        model = FollowUpTask
        fields = [
            "id", "care_plan", "care_plan_title", "patient_name", "hospital_number", "task_type", "description",
            "due_date", "assigned_to", "assigned_to_name", "assigned_department", "assigned_department_name",
            "status", "completed_at", "completed_by", "completed_by_name", "outcome_notes", "resulting_visit",
            "reminder_sent", "escalated_at", "escalated_to", "created_by", "created_at_display",
        ]
        read_only_fields = [
            "id", "status", "completed_at", "completed_by", "reminder_sent", "reminder_sent_at",
            "escalated_at", "escalated_to", "created_by", "created_at_display",
        ]


class CarePlanSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    responsible_doctor_name = serializers.CharField(source="responsible_doctor.get_full_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    tasks = FollowUpTaskSerializer(many=True, read_only=True)
    milestones = CareMilestoneSerializer(many=True, read_only=True)
    monitoring_readings = ChronicMonitoringReadingSerializer(many=True, read_only=True)
    open_task_count = serializers.SerializerMethodField()

    class Meta:
        model = CarePlan
        fields = [
            "id", "patient", "patient_name", "hospital_number", "title", "condition", "icd10_code",
            "source_type", "source_consultation", "source_admission", "source_emergency_visit",
            "source_delivery", "source_referral", "is_chronic", "status", "notes",
            "created_by", "created_by_name", "responsible_doctor", "responsible_doctor_name",
            "responsible_department", "created_at_display", "closed_at",
            "tasks", "milestones", "monitoring_readings", "open_task_count",
        ]
        read_only_fields = ["id", "created_by", "created_at_display", "closed_at"]

    def get_open_task_count(self, obj):
        return obj.tasks.exclude(status__in=["COMPLETED", "CANCELLED", "MISSED"]).count()


class CarePlanListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    responsible_doctor_name = serializers.CharField(source="responsible_doctor.get_full_name", read_only=True)
    open_task_count = serializers.SerializerMethodField()
    next_due_date = serializers.SerializerMethodField()

    class Meta:
        model = CarePlan
        fields = ["id", "patient_name", "title", "condition", "is_chronic", "status", "responsible_doctor_name", "open_task_count", "next_due_date", "created_at_display"]

    def get_open_task_count(self, obj):
        return obj.tasks.exclude(status__in=["COMPLETED", "CANCELLED", "MISSED"]).count()

    def get_next_due_date(self, obj):
        task = obj.tasks.exclude(status__in=["COMPLETED", "CANCELLED", "MISSED"]).order_by("due_date").first()
        return task.due_date if task else None


class CreateCarePlanSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    condition = serializers.CharField(required=False, allow_blank=True, default="")
    icd10_code = serializers.UUIDField(required=False, allow_null=True)
    source_type = serializers.ChoiceField(choices=["CONSULTATION", "DISCHARGE", "EMERGENCY", "DELIVERY", "REFERRAL", "MANUAL"], default="MANUAL")
    source_consultation = serializers.UUIDField(required=False, allow_null=True)
    source_admission = serializers.UUIDField(required=False, allow_null=True)
    source_emergency_visit = serializers.UUIDField(required=False, allow_null=True)
    source_delivery = serializers.UUIDField(required=False, allow_null=True)
    source_referral = serializers.UUIDField(required=False, allow_null=True)
    is_chronic = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    responsible_doctor = serializers.UUIDField(required=False, allow_null=True)
    responsible_department = serializers.UUIDField(required=False, allow_null=True)

    # First follow-up task created inline — matches your example exactly:
    # "Create follow-up plan -> Review after 14 days -> Assign to clinic/doctor"
    first_task_description = serializers.CharField(required=False, allow_blank=True, default="")
    first_task_due_date = serializers.DateField(required=False, allow_null=True)
    first_task_type = serializers.ChoiceField(
        choices=["CLINIC_REVIEW", "PENDING_INVESTIGATION", "SPECIALIST_REVIEW", "REFERRAL_FOLLOWUP", "POST_DISCHARGE_CHECK", "MEDICATION_REVIEW", "OUTREACH_CALL", "OTHER"],
        required=False, default="CLINIC_REVIEW",
    )


class CreateFollowUpTaskSerializer(serializers.Serializer):
    task_type = serializers.ChoiceField(choices=["CLINIC_REVIEW", "PENDING_INVESTIGATION", "SPECIALIST_REVIEW", "REFERRAL_FOLLOWUP", "POST_DISCHARGE_CHECK", "MEDICATION_REVIEW", "OUTREACH_CALL", "OTHER"])
    description = serializers.CharField(max_length=255)
    due_date = serializers.DateField()
    assigned_to = serializers.UUIDField(required=False, allow_null=True)
    assigned_department = serializers.UUIDField(required=False, allow_null=True)


class CompleteTaskSerializer(serializers.Serializer):
    outcome_notes = serializers.CharField(required=False, allow_blank=True, default="")
    resulting_visit = serializers.UUIDField(required=False, allow_null=True)


class MarkMissedSerializer(serializers.Serializer):
    outcome_notes = serializers.CharField()


class AddMilestoneSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    target_date = serializers.DateField(required=False, allow_null=True)


class AddReadingSerializer(serializers.Serializer):
    metric_name = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=50)
    unit = serializers.CharField(required=False, allow_blank=True, default="")