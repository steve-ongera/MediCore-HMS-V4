from rest_framework import serializers
from .models import LoginAttempt, UserSession, SecurityAuditLog, AccountLockout


class LoginAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginAttempt
        fields = ["id", "username_attempted", "user", "status", "ip_address", "browser", "device", "attempted_at"]


class UserSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = UserSession
        fields = ["id", "user", "username", "full_name", "ip_address", "browser", "device", "login_at", "logout_at", "last_activity_at", "is_active"]


class SecurityAuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = SecurityAuditLog
        fields = ["id", "event_type", "user", "username", "actor", "actor_username", "ip_address", "description", "metadata", "occurred_at"]


class AccountLockoutSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    unlocked_by_name = serializers.CharField(source="unlocked_by.get_full_name", read_only=True)

    class Meta:
        model = AccountLockout
        fields = ["id", "user", "username", "full_name", "failed_attempts", "is_locked", "locked_at", "unlocked_by", "unlocked_by_name", "unlocked_at"]