import random
import re

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def parse_user_agent(user_agent):
    """Lightweight browser/device parsing without a third-party dependency."""
    ua = (user_agent or "").lower()

    if "edg/" in ua:
        browser = "Edge"
    elif "chrome" in ua and "chromium" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    else:
        browser = "Unknown"

    if "mobile" in ua or "android" in ua:
        device = "Mobile"
    elif "ipad" in ua or "tablet" in ua:
        device = "Tablet"
    else:
        device = "Desktop"

    return browser, device


def generate_otp_code():
    return f"{random.randint(0, 999999):06d}"


def send_otp_email(user, code):
    send_mail(
        subject="Your MediCore HMIS login code",
        message=(
            f"Hi {user.get_full_name() or user.username},\n\n"
            f"Your login verification code is: {code}\n\n"
            f"This code expires in 5 minutes. If you didn't request this, "
            f"please contact your system administrator immediately.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_lockout_alert_email(user, ip_address):
    admin_email = getattr(settings, "SECURITY_ADMIN_EMAIL", settings.DEFAULT_FROM_EMAIL)
    send_mail(
        subject=f"[Security Alert] Account locked: {user.username}",
        message=(
            f"The account for user '{user.username}' ({user.get_full_name()}) has been "
            f"locked after 3 consecutive failed login attempts.\n\n"
            f"Last attempt from IP: {ip_address}\n"
            f"Time: {timezone.now()}\n\n"
            f"This account cannot log in until a Super Admin unlocks it from "
            f"Settings > Device & Session Monitoring.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[admin_email],
        fail_silently=False,
    )