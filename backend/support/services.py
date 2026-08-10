from django.conf import settings
from django.core.mail import send_mail


def notify_medicore_of_inquiry(inquiry):
    support_email = getattr(settings, "SECURITY_ADMIN_EMAIL", settings.DEFAULT_FROM_EMAIL)
    try:
        send_mail(
            subject=f"[MediCore Support] New inquiry: {inquiry.get_topic_display()}",
            message=(
                f"From: {inquiry.name} <{inquiry.email}>\n"
                f"Phone: {inquiry.phone or 'Not provided'}\n"
                f"Facility: {inquiry.facility_name or 'Not provided'}\n"
                f"Topic: {inquiry.get_topic_display()}\n\n"
                f"Message:\n{inquiry.message}\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[support_email],
            fail_silently=True,  # a failed notification email shouldn't block the inquiry from being saved
        )
    except Exception:
        pass