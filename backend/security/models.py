from django.db import models
from api.models import BaseModel, User


class LoginAttemptStatus(models.TextChoices):
    SUCCESS = "SUCCESS", "Success"
    FAILED_PASSWORD = "FAILED_PASSWORD", "Failed - Wrong Password"
    FAILED_OTP = "FAILED_OTP", "Failed - Wrong OTP"
    LOCKED_OUT = "LOCKED_OUT", "Blocked - Account Locked"
    RATE_LIMITED = "RATE_LIMITED", "Blocked - Rate Limited"


class LoginAttempt(BaseModel):
    """Immutable record of every login attempt, successful or not — never updated or deleted after creation."""
    username_attempted = models.CharField(max_length=150)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="login_attempts")
    status = models.CharField(max_length=20, choices=LoginAttemptStatus.choices)
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=500, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    device = models.CharField(max_length=100, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "login_attempts"
        ordering = ["-attempted_at"]
        indexes = [
            models.Index(fields=["username_attempted", "attempted_at"]),
            models.Index(fields=["ip_address", "attempted_at"]),
        ]

    def __str__(self):
        return f"{self.username_attempted} - {self.status} @ {self.attempted_at}"


class UserSession(BaseModel):
    """One row per login session — tracks device/IP/login-logout for security monitoring."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=500, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    device = models.CharField(max_length=100, blank=True)
    login_at = models.DateTimeField(auto_now_add=True)
    logout_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    refresh_token_jti = models.CharField(max_length=255, blank=True, help_text="JTI of the refresh token tied to this session, for forced logout.")

    class Meta:
        db_table = "user_sessions"
        ordering = ["-login_at"]

    def __str__(self):
        return f"{self.user.username} - {self.ip_address} @ {self.login_at}"


class OTPPurpose(models.TextChoices):
    LOGIN = "LOGIN", "Login Verification"


class LoginOTP(BaseModel):
    """Short-lived OTP for two-factor login. One active code per user at a time — a new request invalidates the previous one."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="login_otps")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=OTPPurpose.choices, default=OTPPurpose.LOGIN)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at_display = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "login_otps"
        ordering = ["-created_at_display"]

    def __str__(self):
        return f"OTP for {self.user.username} ({'used' if self.is_used else 'active'})"


class AccountLockout(BaseModel):
    """One row per user — tracks consecutive failed attempts and lock status. Reset on successful login."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="lockout")
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    unlocked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="lockouts_cleared")
    unlocked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "account_lockouts"

    def __str__(self):
        return f"{self.user.username} - {'LOCKED' if self.is_locked else 'OK'} ({self.failed_attempts} failed)"


class AuditEventType(models.TextChoices):
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    FAILED_LOGIN = "FAILED_LOGIN", "Failed Login"
    PASSWORD_CHANGE = "PASSWORD_CHANGE", "Password Change"
    ROLE_CHANGE = "ROLE_CHANGE", "Role Change"
    MFA_CHANGE = "MFA_CHANGE", "MFA Change"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED", "Account Locked"
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED", "Account Unlocked"
    SESSION_EXPIRED = "SESSION_EXPIRED", "Session Expired (Inactivity)"


class SecurityAuditLog(BaseModel):
    """
    Immutable security event log. No update/delete path is exposed anywhere
    in the API — only creation (by the system) and read (by Super Admin).
    """
    event_type = models.CharField(max_length=30, choices=AuditEventType.choices)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="security_audit_logs")
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="security_actions_performed", help_text="Who performed the action, if different from `user` (e.g. an admin changing someone else's role).")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    description = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "security_audit_logs"
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.event_type} - {self.user} @ {self.occurred_at}"