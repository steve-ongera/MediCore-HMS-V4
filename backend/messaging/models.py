from django.db import models
from api.models import BaseModel, User


class Conversation(BaseModel):
    """
    A thread between two or more staff. is_group distinguishes a direct
    1:1 chat from a named group (e.g. a whole department). Participants
    tracked via ConversationParticipant, which also stores per-user
    last_read_at for computing unread counts.
    """
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=150, blank=True, help_text="Only used for group conversations.")
    participants = models.ManyToManyField(User, through="ConversationParticipant", related_name="conversations")
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="conversations_created")

    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at"]

    def __str__(self):
        if self.is_group:
            return self.name or f"Group {self.id}"
        names = [p.user.get_full_name() for p in self.conversationparticipant_set.select_related("user")[:2]]
        return " & ".join(names) if names else f"Conversation {self.id}"


class ConversationParticipant(BaseModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversation_participants"
        unique_together = ("conversation", "user")

    def __str__(self):
        return f"{self.user.username} in {self.conversation_id}"


class Message(BaseModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages_sent")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.username}: {self.text[:40]}"