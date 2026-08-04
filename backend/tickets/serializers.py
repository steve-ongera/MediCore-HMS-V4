from rest_framework import serializers
from .models import Ticket, TicketComment


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "author_name", "text", "created_at"]
        read_only_fields = ["id", "ticket", "author", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)
    raised_by_role = serializers.CharField(source="raised_by.role", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    resolution_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "ticket_number", "raised_by", "raised_by_name", "raised_by_role", "category", "priority",
            "location", "subject", "description", "status", "assigned_to", "assigned_to_name",
            "raised_at", "assigned_at", "resolved_at", "closed_at", "resolution_notes",
            "satisfaction_rating", "resolution_hours", "comments",
        ]
        read_only_fields = ["id", "ticket_number", "raised_by", "status", "assigned_to", "raised_at", "assigned_at", "resolved_at", "closed_at"]


class TicketListSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)

    class Meta:
        model = Ticket
        fields = ["id", "ticket_number", "raised_by_name", "category", "priority", "subject", "status", "assigned_to_name", "raised_at"]


class CloseTicketSerializer(serializers.Serializer):
    satisfaction_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)