from rest_framework import serializers
from .models import RevenueLeakageRecord, LeakageScanLog


class RevenueLeakageRecordSerializer(serializers.ModelSerializer):
    resolved_by_name = serializers.CharField(source="resolved_by.get_full_name", read_only=True)

    class Meta:
        model = RevenueLeakageRecord
        fields = [
            "id", "source_type", "source_object_id", "patient_name", "hospital_number",
            "description", "expected_amount", "event_date", "status",
            "resolved_invoice", "resolved_by", "resolved_by_name", "resolved_at",
            "write_off_reason", "detected_at",
        ]
        read_only_fields = ["id", "detected_at"]


class LeakageScanLogSerializer(serializers.ModelSerializer):
    triggered_by_name = serializers.CharField(source="triggered_by.get_full_name", read_only=True)

    class Meta:
        model = LeakageScanLog
        fields = ["id", "started_at", "completed_at", "triggered_by", "triggered_by_name", "new_leaks_found", "total_open_leaks", "total_leaked_amount"]


class WriteOffLeakSerializer(serializers.Serializer):
    reason = serializers.CharField()