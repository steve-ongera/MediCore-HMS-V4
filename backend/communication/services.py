from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from api.models import User
from notifications.services import notify
from notifications.models import NotificationType, NotificationCategory, NotificationPriority


def get_recipients(announcement):
    """Empty target_roles means every active staff member."""
    qs = User.objects.filter(is_active_staff=True)
    if announcement.target_roles:
        qs = qs.filter(role__in=announcement.target_roles)
    return qs


def _priority_for_type(announcement_type):
    if announcement_type in ("EMERGENCY",):
        return NotificationPriority.CRITICAL
    if announcement_type in ("MAINTENANCE", "POLICY"):
        return NotificationPriority.HIGH
    return NotificationPriority.NORMAL


def send_announcement(announcement):
    """
    Delivers an announcement across all enabled channels. Runs synchronously
    — for very large staff rosters (500+) you'd want this on a background
    task queue (Celery), but for typical hospital staff counts (tens to a
    few hundred) a synchronous batch is fine and keeps the stack simple.
    """
    from .models import AnnouncementReceipt, DeliveryStatus

    announcement.status = DeliveryStatus.SENDING
    announcement.save(update_fields=["status"])

    recipients = list(get_recipients(announcement))
    announcement.recipient_count = len(recipients)

    sent_count = 0
    failed_count = 0

    for user in recipients:
        receipt, _ = AnnouncementReceipt.objects.get_or_create(announcement=announcement, recipient=user)

        if announcement.send_in_app:
            notify(
                user, NotificationType.HOSPITAL_ANNOUNCEMENT, announcement.title,
                announcement.body[:200], link=f"/announcements/{announcement.id}",
                priority=_priority_for_type(announcement.announcement_type),
                category=NotificationCategory.ANNOUNCEMENT,
            )

        if announcement.send_email:
            if not user.email:
                receipt.email_status = "SKIPPED"
                receipt.save(update_fields=["email_status"])
                continue
            try:
                _send_email(announcement, user)
                receipt.email_status = "SENT"
                receipt.save(update_fields=["email_status"])
                sent_count += 1
            except Exception as exc:
                receipt.email_status = "FAILED"
                receipt.email_error = str(exc)[:255]
                receipt.save(update_fields=["email_status", "email_error"])
                failed_count += 1

    announcement.email_sent_count = sent_count
    announcement.email_failed_count = failed_count
    announcement.status = DeliveryStatus.SENT
    announcement.sent_at = timezone.now()
    announcement.save(update_fields=["email_sent_count", "email_failed_count", "status", "sent_at", "recipient_count"])

    return announcement


def _send_email(announcement, user):
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>{announcement.title}</h2>
      <p style="color: #666; font-size: 0.85em;">{announcement.get_announcement_type_display()}</p>
      <div>{announcement.body.replace(chr(10), '<br>')}</div>
      {f'<img src="{announcement.image.url}" style="max-width:100%; margin-top:16px;" />' if announcement.image else ''}
      {f'<p><strong>Event date:</strong> {announcement.event_date.strftime("%d %b %Y, %H:%M")}</p>' if announcement.event_date else ''}
      <hr style="margin-top:24px;">
      <p style="font-size:0.8em; color:#999;">This is an automated message from {getattr(settings, "HOSPITAL_NAME", "your hospital")}'s HMIS. Please do not reply to this email.</p>
    </div>
    """
    email = EmailMultiAlternatives(
        subject=f"[{getattr(settings, 'HOSPITAL_NAME', 'Hospital')}] {announcement.title}",
        body=announcement.body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)