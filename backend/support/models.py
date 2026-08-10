from django.db import models
from api.models import BaseModel, User


class InquiryStatus(models.TextChoices):
    NEW = "NEW", "New"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"


class InquiryTopic(models.TextChoices):
    TECHNICAL_SUPPORT = "TECHNICAL_SUPPORT", "Technical Support"
    BILLING_LICENSING = "BILLING_LICENSING", "Billing / Licensing"
    FEATURE_REQUEST = "FEATURE_REQUEST", "Feature Request"
    TRAINING = "TRAINING", "Training Request"
    GENERAL = "GENERAL", "General Inquiry"


class ContactInquiry(BaseModel):
    """
    Submissions from the Contact Us page — reaches MediCore's support team
    (via email + this record), not routed through the hospital's own IT
    ticketing since that's for the hospital's own internal issues, not
    inquiries directed at MediCore itself.
    """
    submitted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="contact_inquiries")
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    facility_name = models.CharField(max_length=200, blank=True)
    topic = models.CharField(max_length=30, choices=InquiryTopic.choices, default=InquiryTopic.GENERAL)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=InquiryStatus.choices, default=InquiryStatus.NEW)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "contact_inquiries"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.name} - {self.topic} ({self.status})"