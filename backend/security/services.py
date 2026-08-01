from datetime import timedelta
import logging

from django.conf import settings
from django.utils import timezone

from .models import (
    LoginAttempt,
    LoginAttemptStatus,
    UserSession,
    LoginOTP,
    OTPPurpose,
    AccountLockout,
    SecurityAuditLog,
    AuditEventType,
)
from .utils import (
    get_client_ip,
    parse_user_agent,
    generate_otp_code,
    send_otp_email,
    send_lockout_alert_email,
)

logger = logging.getLogger("security")

MAX_FAILED_ATTEMPTS = 3
OTP_VALIDITY_MINUTES = 5
SESSION_IDLE_TIMEOUT_MINUTES = 5


def log_audit_event(
    event_type,
    user=None,
    actor=None,
    request=None,
    description="",
    metadata=None,
):
    ip = get_client_ip(request) if request else None

    SecurityAuditLog.objects.create(
        event_type=event_type,
        user=user,
        actor=actor or user,
        ip_address=ip,
        description=description,
        metadata=metadata or {},
    )


def get_or_create_lockout(user):
    lockout, _ = AccountLockout.objects.get_or_create(user=user)
    return lockout


def record_failed_attempt(
    user,
    request,
    reason=LoginAttemptStatus.FAILED_PASSWORD,
):
    ip = get_client_ip(request)
    browser, device = parse_user_agent(
        request.META.get("HTTP_USER_AGENT", "")
    )

    LoginAttempt.objects.create(
        username_attempted=user.username if user else request.data.get("username", ""),
        user=user,
        status=reason,
        ip_address=ip,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        browser=browser,
        device=device,
    )

    if not user:
        return None

    lockout = get_or_create_lockout(user)
    lockout.failed_attempts += 1

    if (
        lockout.failed_attempts >= MAX_FAILED_ATTEMPTS
        and not lockout.is_locked
    ):
        lockout.is_locked = True
        lockout.locked_at = timezone.now()
        lockout.save()

        log_audit_event(
            AuditEventType.ACCOUNT_LOCKED,
            user=user,
            request=request,
            description=f"Account locked after {MAX_FAILED_ATTEMPTS} failed attempts.",
        )

        send_lockout_alert_email(user, ip)

        # ------------------------------------------------------------------
        # Notify Super Admins
        # ------------------------------------------------------------------
        try:
            from notifications.services import notify_super_admins
            from notifications.models import (
                NotificationType,
                NotificationCategory,
                NotificationPriority,
            )

            notify_super_admins(
                NotificationType.FAILED_LOGIN_DETECTED,
                f"Account locked: {user.username}",
                f"{MAX_FAILED_ATTEMPTS} consecutive failed login attempts from IP {ip}.",
                link="/settings/sessions",
                priority=NotificationPriority.CRITICAL,
                category=NotificationCategory.SECURITY,
            )
        except Exception:
            logger.exception(
                "Failed to create super admin notification for account lockout."
            )

    else:
        lockout.save()

    return lockout


def reset_lockout(user):
    lockout = get_or_create_lockout(user)

    if lockout.failed_attempts > 0 or lockout.is_locked:
        lockout.failed_attempts = 0
        lockout.is_locked = False
        lockout.locked_at = None
        lockout.save()


def create_and_send_otp(user, request):
    LoginOTP.objects.filter(
        user=user,
        is_used=False,
    ).update(is_used=True)

    code = generate_otp_code()

    LoginOTP.objects.create(
        user=user,
        code=code,
        purpose=OTPPurpose.LOGIN,
        expires_at=timezone.now()
        + timedelta(minutes=OTP_VALIDITY_MINUTES),
        ip_address=get_client_ip(request),
    )

    try:
        send_otp_email(user, code)
    except Exception as exc:
        logger.error(
            f"Failed to send OTP email to {user.email}: {exc}"
        )
        raise


def verify_otp(user, code):
    otp = (
        LoginOTP.objects.filter(
            user=user,
            code=code,
            is_used=False,
            purpose=OTPPurpose.LOGIN,
        )
        .order_by("-created_at_display")
        .first()
    )

    if not otp:
        return False

    if otp.expires_at < timezone.now():
        return False

    otp.is_used = True
    otp.save(update_fields=["is_used"])

    return True


def start_session(user, request, refresh_jti=""):
    ip = get_client_ip(request)
    browser, device = parse_user_agent(
        request.META.get("HTTP_USER_AGENT", "")
    )

    session = UserSession.objects.create(
        user=user,
        ip_address=ip,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        browser=browser,
        device=device,
        refresh_token_jti=refresh_jti,
    )

    LoginAttempt.objects.create(
        username_attempted=user.username,
        user=user,
        status=LoginAttemptStatus.SUCCESS,
        ip_address=ip,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        browser=browser,
        device=device,
    )

    log_audit_event(
        AuditEventType.LOGIN,
        user=user,
        request=request,
        description="Successful login.",
    )

    return session


def end_session(
    session,
    event_type=AuditEventType.LOGOUT,
    request=None,
):
    session.is_active = False
    session.logout_at = timezone.now()
    session.save(update_fields=["is_active", "logout_at"])

    log_audit_event(
        event_type,
        user=session.user,
        request=request,
        description=(
            "Session ended."
            if event_type == AuditEventType.LOGOUT
            else "Session expired due to inactivity."
        ),
    )