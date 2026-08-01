from rest_framework import serializers
from django.utils import timezone

from .models import Conversation, ConversationParticipant, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "sender_name", "text", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    participant_names = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "is_group", "name", "participant_names", "other_participant", "last_message", "unread_count", "updated_at"]

    def get_participant_names(self, obj):
        return [p.user.get_full_name() for p in obj.conversationparticipant_set.select_related("user").all()]

    def get_other_participant(self, obj):
        """For 1:1 chats — the person who ISN'T the requesting user, so the frontend can show a clean chat header."""
        request = self.context.get("request")
        if obj.is_group or not request:
            return None
        other = obj.conversationparticipant_set.exclude(user=request.user).select_related("user").first()
        if not other:
            return None
        return {"id": str(other.user.id), "name": other.user.get_full_name(), "role": other.user.role}

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {"text": msg.text, "sender_name": msg.sender.get_full_name(), "created_at": msg.created_at}

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        participant = obj.conversationparticipant_set.filter(user=request.user).first()
        if not participant:
            return 0
        qs = obj.messages.exclude(sender=request.user)
        if participant.last_read_at:
            qs = qs.filter(created_at__gt=participant.last_read_at)
        return qs.count()


class StartConversationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=1)