#tickets/models.py
from django.db import models
from api.models import BaseModel, User


class TicketCategory(models.TextChoices):
    HARDWARE = "HARDWARE", "Hardware (Printer, Scanner, PC)"
    NETWORK = "NETWORK", "Network / WiFi"
    SOFTWARE = "SOFTWARE", "Software / HMIS System"
    CCTV = "CCTV", "CCTV / Security Systems"
    TELEPHONY = "TELEPHONY", "Telephone / Intercom"
    ACCOUNT_ACCESS = "ACCOUNT_ACCESS", "Account / Login Access"
    OTHER = "OTHER", "Other"


class TicketPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical (Department Down)"


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    ASSIGNED = "ASSIGNED", "Assigned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"
    REOPENED = "REOPENED", "Reopened"


class Ticket(BaseModel):
    ticket_number = models.CharField(max_length=30, unique=True, editable=False)
    raised_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="tickets_raised")
    category = models.CharField(max_length=20, choices=TicketCategory.choices, default=TicketCategory.OTHER)
    priority = models.CharField(max_length=20, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    location = models.CharField(max_length=150, blank=True, help_text="e.g. Ward 3, Reception Desk 2, Pharmacy")
    subject = models.CharField(max_length=255)
    description = models.TextField()

    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="tickets_assigned")

    raised_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    resolution_notes = models.TextField(blank=True)
    satisfaction_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5, given by raiser on close.")

    class Meta:
        db_table = "tickets"
        ordering = ["-raised_at"]

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            import uuid
            from django.utils import timezone
            self.ticket_number = f"TCK-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @property
    def resolution_hours(self):
        if not self.resolved_at:
            return None
        return round((self.resolved_at - self.raised_at).total_seconds() / 3600, 1)

    def __str__(self):
        return f"{self.ticket_number} - {self.subject} ({self.status})"


class TicketComment(BaseModel):
    """Back-and-forth thread on a ticket — the raiser and IT staff can both post updates."""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ticket_comments")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_comments"
        ordering = ["created_at"]