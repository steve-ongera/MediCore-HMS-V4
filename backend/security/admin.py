# security/admin.py
from django.contrib import admin
from .models import LoginAttempt, UserSession, LoginOTP, AccountLockout, SecurityAuditLog

@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ["username_attempted", "status", "ip_address", "attempted_at"]
    list_filter = ["status"]

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "ip_address", "device", "login_at", "is_active"]

@admin.register(AccountLockout)
class AccountLockoutAdmin(admin.ModelAdmin):
    list_display = ["user", "failed_attempts", "is_locked"]

admin.site.register(LoginOTP)
admin.site.register(SecurityAuditLog)