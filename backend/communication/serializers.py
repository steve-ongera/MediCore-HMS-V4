from rest_framework import serializers
from .models import Announcement, AnnouncementReceipt


class AnnouncementReceiptSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source="recipient.get_full_name", read_only=True)
    recipient_role = serializers.CharField(source="recipient.role", read_only=True)

    class Meta:
        model = AnnouncementReceipt
        fields = ["id", "recipient", "recipient_name", "recipient_role", "is_read", "read_at", "email_status", "email_error"]


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    receipts = AnnouncementReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "image", "announcement_type", "target_roles", "event_date",
            "send_email", "send_in_app", "status", "recipient_count", "email_sent_count",
            "email_failed_count", "created_by", "created_by_name", "created_at_display", "sent_at", "receipts",
        ]
        read_only_fields = ["id", "status", "recipient_count", "email_sent_count", "email_failed_count", "created_by", "created_at_display", "sent_at"]


class AnnouncementListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "announcement_type", "status", "target_roles", "recipient_count", "email_sent_count", "created_by_name", "created_at_display"]


class MyAnnouncementSerializer(serializers.ModelSerializer):
    """What a regular staff member sees when viewing an announcement addressed to them — no delivery internals."""
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "body", "image", "announcement_type", "event_date", "created_by_name", "created_at_display"]