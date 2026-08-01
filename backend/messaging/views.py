from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils import timezone

from api.models import User
from .models import Conversation, ConversationParticipant, Message
from .serializers import ConversationSerializer, MessageSerializer, StartConversationSerializer, SendMessageSerializer


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).prefetch_related(
            "conversationparticipant_set__user", "messages"
        ).distinct()

    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        """Gets-or-creates a 1:1 conversation with another user — the entry point for 'chat with this person'."""
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        other_user_id = serializer.validated_data["user_id"]

        if str(other_user_id) == str(request.user.id):
            raise ValidationError({"detail": "Cannot start a conversation with yourself."})

        other_user = User.objects.filter(pk=other_user_id).first()
        if not other_user:
            raise ValidationError({"user_id": "User not found."})

        existing = Conversation.objects.filter(is_group=False, participants=request.user).filter(participants=other_user).first()
        if existing:
            return Response(ConversationSerializer(existing, context={"request": request}).data)

        conversation = Conversation.objects.create(is_group=False, created_by=request.user)
        ConversationParticipant.objects.create(conversation=conversation, user=request.user)
        ConversationParticipant.objects.create(conversation=conversation, user=other_user)

        return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        conversation = self.get_object()
        msgs = conversation.messages.select_related("sender").all()
        return Response(MessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        conversation = self.get_object()
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(conversation=conversation, sender=request.user, text=serializer.validated_data["text"])
        conversation.save(update_fields=[])  # bumps updated_at via auto_now on BaseModel, if present

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        participant, _ = ConversationParticipant.objects.get_or_create(conversation=conversation, user=request.user)
        participant.last_read_at = timezone.now()
        participant.save(update_fields=["last_read_at"])
        return Response({"success": True})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Total unread across every conversation — powers the navbar badge."""
        total = 0
        for conv in self.get_queryset():
            participant = conv.conversationparticipant_set.filter(user=request.user).first()
            if not participant:
                continue
            qs = conv.messages.exclude(sender=request.user)
            if participant.last_read_at:
                qs = qs.filter(created_at__gt=participant.last_read_at)
            total += qs.count()
        return Response({"unread_count": total})