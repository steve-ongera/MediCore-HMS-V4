import time
from collections import defaultdict, deque

from django.conf import settings
from django.utils import timezone
from django.http import JsonResponse

from .utils import get_client_ip

# In-memory rate limit store — fine for a single-process dev/small deployment.
# For multi-worker production, swap this for a Redis-backed counter.
_rate_limit_store = defaultdict(deque)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10


class LoginRateLimitMiddleware:
    """Limits POST /api/auth/login/ to 10 requests per minute per IP."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path.rstrip("/") == "/api/auth/login":
            ip = get_client_ip(request)
            now = time.time()
            bucket = _rate_limit_store[ip]

            while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SECONDS:
                bucket.popleft()

            if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
                return JsonResponse(
                    {"success": False, "errors": {"detail": "Too many login attempts. Please try again in a minute."}},
                    status=429,
                )
            bucket.append(now)

        return self.get_response(request)


class SessionIdleTimeoutMiddleware:
    """
    Logs a user out after 5 minutes of inactivity. Checks UserSession.last_activity_at
    on every authenticated request; if stale, invalidates the session and rejects
    the request with 401 so the frontend redirects to login.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            from .models import UserSession
            from .services import end_session
            from .models import AuditEventType

            session = UserSession.objects.filter(user=request.user, is_active=True).order_by("-login_at").first()
            if session:
                idle_seconds = (timezone.now() - session.last_activity_at).total_seconds()
                if idle_seconds > 5 * 60:
                    end_session(session, event_type=AuditEventType.SESSION_EXPIRED, request=request)
                    return JsonResponse(
                        {"success": False, "errors": {"detail": "Session expired due to inactivity. Please log in again."}},
                        status=401,
                    )
                session.last_activity_at = timezone.now()
                session.save(update_fields=["last_activity_at"])

        return self.get_response(request)