# notifications/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "notification_type", "category", "priority", "title", "message", "link", "metadata", "is_read", "read_at", "created_at"]
        read_only_fields = fields