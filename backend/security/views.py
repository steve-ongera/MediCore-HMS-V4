from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.permissions import IsSuperAdmin , IsITSupportOrSuperAdmin

from .models import LoginAttempt, UserSession, SecurityAuditLog, AccountLockout
from .serializers import LoginAttemptSerializer, UserSessionSerializer, SecurityAuditLogSerializer, AccountLockoutSerializer
from .services import reset_lockout, log_audit_event
from .models import AuditEventType


class LoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoginAttempt.objects.all()
    serializer_class = LoginAttemptSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    filterset_fields = ["status", "user"]
    search_fields = ["username_attempted", "ip_address"]


class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserSession.objects.select_related("user").all()
    serializer_class = UserSessionSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    filterset_fields = ["user", "is_active"]
    search_fields = ["user__username", "ip_address"]

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(is_active=True)
        return Response(UserSessionSerializer(qs, many=True).data)


class SecurityAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only by design — no create/update/delete endpoint exists for audit
    logs anywhere in the API. Entries are only ever written by
    security.services.log_audit_event() from server-side code.
    """
    queryset = SecurityAuditLog.objects.select_related("user", "actor").all()
    serializer_class = SecurityAuditLogSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    filterset_fields = ["event_type", "user"]
    search_fields = ["description", "user__username"]


class AccountLockoutViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AccountLockout.objects.select_related("user").all()
    serializer_class = AccountLockoutSerializer
    permission_classes = [IsITSupportOrSuperAdmin]
    filterset_fields = ["is_locked"]

    @action(detail=True, methods=["post"], url_path="unlock")
    def unlock(self, request, pk=None):
        lockout = self.get_object()
        if not lockout.is_locked:
            raise ValidationError({"detail": "This account is not locked."})
        lockout.is_locked = False
        lockout.failed_attempts = 0
        lockout.unlocked_by = request.user
        lockout.unlocked_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        lockout.save()
        log_audit_event(AuditEventType.ACCOUNT_UNLOCKED, user=lockout.user, actor=request.user, request=request,
                         description=f"Account unlocked by {request.user.username}.")
        return Response(AccountLockoutSerializer(lockout).data)