# security/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginAttemptViewSet, UserSessionViewSet, SecurityAuditLogViewSet, AccountLockoutViewSet

router = DefaultRouter()
router.register(r"login-attempts", LoginAttemptViewSet, basename="login-attempt")
router.register(r"user-sessions", UserSessionViewSet, basename="user-session")
router.register(r"security-audit-logs", SecurityAuditLogViewSet, basename="security-audit-log")
router.register(r"account-lockouts", AccountLockoutViewSet, basename="account-lockout")

urlpatterns = [path("", include(router.urls))]