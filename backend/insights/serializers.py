# insights/serializers.py
from rest_framework import serializers
from .models import BusinessInsight

class BusinessInsightSerializer(serializers.ModelSerializer):
    acknowledged_by_name = serializers.CharField(source="acknowledged_by.get_full_name", read_only=True)

    class Meta:
        model = BusinessInsight
        fields = ["id", "category", "severity", "headline", "detail", "metrics", "is_stale", "acknowledged_by", "acknowledged_by_name", "acknowledged_at", "generated_at"]
        read_only_fields = ["id", "generated_at"]