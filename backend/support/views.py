# support/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from api.permissions import IsSuperAdmin
from .models import ContactInquiry
from .serializers import ContactInquirySerializer
from .services import notify_medicore_of_inquiry


class ContactInquiryViewSet(viewsets.ModelViewSet):
    """
    Create is open to any authenticated staff member (submitting a support
    request doesn't need special privileges) — list/view is Super-Admin-only
    since it's the facility's internal record of what's been raised with
    MediCore, not something every role needs visibility into.
    """
    queryset = ContactInquiry.objects.all()
    serializer_class = ContactInquirySerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def perform_create(self, serializer):
        inquiry = serializer.save(submitted_by=self.request.user if self.request.user.is_authenticated else None)
        notify_medicore_of_inquiry(inquiry)