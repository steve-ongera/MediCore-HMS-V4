from django.db import models
from api.models import BaseModel, User, Role


class AnnouncementType(models.TextChoices):
    GENERAL = "GENERAL", "General Announcement"
    TRAINING = "TRAINING", "Training / Event"
    MAINTENANCE = "MAINTENANCE", "System Maintenance"
    POLICY = "POLICY", "Policy Update"
    EMERGENCY = "EMERGENCY", "Emergency / Critical Incident"
    HR_NOTICE = "HR_NOTICE", "HR Notice"


class DeliveryStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SENDING = "SENDING", "Sending"
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"


class Announcement(BaseModel):
    """
    A hospital-wide or role-targeted communication. Delivered through
    three channels simultaneously: in-app Notification (persists in the
    bell dropdown), flash toast (immediate on-screen), and bulk email.
    target_roles empty means "all staff."
    """
    title = models.CharField(max_length=255)
    body = models.TextField()
    image = models.ImageField(upload_to="announcements/%Y/%m/", null=True, blank=True)
    announcement_type = models.CharField(max_length=20, choices=AnnouncementType.choices, default=AnnouncementType.GENERAL)
    target_roles = models.JSONField(default=list, blank=True, help_text="List of Role values. Empty = all staff.")

    event_date = models.DateTimeField(null=True, blank=True, help_text="For training/events/maintenance — when the thing is actually happening.")

    send_email = models.BooleanField(default=True)
    send_in_app = models.BooleanField(default=True)

    status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.DRAFT)
    recipient_count = models.PositiveIntegerField(default=0)
    email_sent_count = models.PositiveIntegerField(default=0)
    email_failed_count = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="announcements_created")
    created_at_display = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "announcements"
        ordering = ["-created_at_display"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class AnnouncementReceipt(BaseModel):
    """One row per recipient — tracks in-app read status and email delivery outcome per person, for accountability."""
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name="receipts")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="announcement_receipts")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    email_status = models.CharField(max_length=20, choices=[("PENDING", "Pending"), ("SENT", "Sent"), ("FAILED", "Failed"), ("SKIPPED", "Skipped — no email on file")], default="PENDING")
    email_error = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "announcement_receipts"
        unique_together = ("announcement", "recipient")