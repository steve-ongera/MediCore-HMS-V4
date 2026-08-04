from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils import timezone

from api.permissions import HasRole
from api.models import Role

from .models import Announcement, AnnouncementReceipt, DeliveryStatus
from .serializers import AnnouncementSerializer, AnnouncementListSerializer, MyAnnouncementSerializer
from .services import send_announcement


class CanBroadcast(HasRole):
    """Who's allowed to send hospital-wide communications — Super Admin plus HR (matches your original ask: 'super admin or users with high roles')."""
    def has_permission(self, request, view):
        view.allowed_roles = [Role.SUPER_ADMIN, Role.HR_OFFICER]
        return super().has_permission(request, view)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.select_related("created_by").prefetch_related("receipts__recipient").all()
    permission_classes = [CanBroadcast]
    filterset_fields = ["status", "announcement_type"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return AnnouncementListSerializer if self.action == "list" else AnnouncementSerializer

    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        announcement = self.get_object()
        if announcement.status != DeliveryStatus.DRAFT:
            raise ValidationError({"detail": "This announcement has already been sent."})
        announcement = send_announcement(announcement)
        return Response(AnnouncementSerializer(announcement).data)


class MyAnnouncementsViewSet(viewsets.ReadOnlyModelViewSet):
    """What any staff member sees — announcements addressed to them, based on their AnnouncementReceipt rows."""
    serializer_class = MyAnnouncementSerializer

    def get_queryset(self):
        receipt_announcement_ids = AnnouncementReceipt.objects.filter(recipient=self.request.user).values_list("announcement_id", flat=True)
        return Announcement.objects.filter(id__in=receipt_announcement_ids, status=DeliveryStatus.SENT).order_by("-sent_at")

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        announcement = self.get_object()
        receipt, _ = AnnouncementReceipt.objects.get_or_create(announcement=announcement, recipient=request.user)
        receipt.is_read = True
        receipt.read_at = timezone.now()
        receipt.save(update_fields=["is_read", "read_at"])
        return Response({"success": True})