from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.permissions import HasRole
from api.models import Role
from notifications.services import notify, notify_role
from notifications.models import NotificationType, NotificationCategory, NotificationPriority

from .models import Ticket, TicketStatus, TicketComment
from .serializers import TicketSerializer, TicketListSerializer, TicketCommentSerializer, CloseTicketSerializer


class IsITSupport(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.IT_SUPPORT_OFFICER]
        return super().has_permission(request, view)


class TicketViewSet(viewsets.ModelViewSet):
    """Any staff member can raise a ticket and view/comment on their own; IT staff see and manage everything."""
    queryset = Ticket.objects.select_related("raised_by", "assigned_to").prefetch_related("comments__author").all()
    filterset_fields = ["status", "category", "priority"]
    search_fields = ["ticket_number", "subject", "raised_by__full_name"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return TicketListSerializer if self.action == "list" else TicketSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == Role.IT_SUPPORT_OFFICER or self.request.user.role == Role.SUPER_ADMIN:
            return qs
        return qs.filter(raised_by=self.request.user)  # everyone else only sees their own tickets

    def perform_create(self, serializer):
        ticket = serializer.save(raised_by=self.request.user)
        priority_map = {
            "CRITICAL": NotificationPriority.CRITICAL,
            "HIGH": NotificationPriority.HIGH,
        }
        notify_role(
            Role.IT_SUPPORT_OFFICER, NotificationType.SYSTEM_MAINTENANCE_SCHEDULED,
            f"New ticket: {ticket.subject}",
            f"{ticket.raised_by.get_full_name()} raised a {ticket.priority} priority ticket ({ticket.category}).",
            link=f"/tickets/{ticket.id}",
            priority=priority_map.get(ticket.priority, NotificationPriority.NORMAL),
            category=NotificationCategory.SYSTEM,
        )

    def get_permissions(self):
        if self.action in ("assign", "start_progress", "resolve", "close", "reopen"):
            if self.action == "reopen" or self.action == "close":
                return []  # raiser can reopen/close their own ticket; checked in the action itself
            return [IsITSupport()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="comment")
    def comment(self, request, pk=None):
        ticket = self.get_object()
        text = request.data.get("text", "").strip()
        if not text:
            raise ValidationError({"text": "Comment cannot be empty."})
        comment = TicketComment.objects.create(ticket=ticket, author=request.user, text=text)

        # Notify the other party in the conversation
        other_user = ticket.assigned_to if request.user == ticket.raised_by else ticket.raised_by
        if other_user:
            notify(
                other_user, NotificationType.DEPARTMENT_MESSAGE, f"New comment on {ticket.ticket_number}",
                text[:150], link=f"/tickets/{ticket.id}", category=NotificationCategory.SYSTEM,
            )

        return Response(TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status not in (TicketStatus.OPEN, TicketStatus.REOPENED):
            raise ValidationError({"detail": "Only open/reopened tickets can be assigned."})
        ticket.assigned_to = request.user
        ticket.status = TicketStatus.ASSIGNED
        ticket.assigned_at = timezone.now()
        ticket.save(update_fields=["assigned_to", "status", "assigned_at"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="start-progress")
    def start_progress(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != TicketStatus.ASSIGNED:
            raise ValidationError({"detail": "Only assigned tickets can be started."})
        ticket.status = TicketStatus.IN_PROGRESS
        ticket.save(update_fields=["status"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status not in (TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS):
            raise ValidationError({"detail": "Only assigned/in-progress tickets can be resolved."})
        ticket.status = TicketStatus.RESOLVED
        ticket.resolution_notes = request.data.get("resolution_notes", "")
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolution_notes", "resolved_at"])

        notify(
            ticket.raised_by, NotificationType.DEPARTMENT_MESSAGE, f"Ticket resolved: {ticket.subject}",
            "Your IT support ticket has been marked resolved. Please confirm and close it if the issue is fixed.",
            link=f"/tickets/{ticket.id}", category=NotificationCategory.SYSTEM,
        )
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        """Only the person who raised the ticket (or IT/Super Admin) can close it — confirms the issue is actually fixed."""
        ticket = self.get_object()
        if request.user != ticket.raised_by and request.user.role not in ("IT_SUPPORT_OFFICER", "SUPER_ADMIN"):
            raise ValidationError({"detail": "Only the ticket raiser or IT support can close this ticket."})
        if ticket.status != TicketStatus.RESOLVED:
            raise ValidationError({"detail": "Only resolved tickets can be closed."})

        serializer = CloseTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.status = TicketStatus.CLOSED
        ticket.satisfaction_rating = serializer.validated_data.get("satisfaction_rating")
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=["status", "satisfaction_rating", "closed_at"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        if request.user != ticket.raised_by and request.user.role not in ("IT_SUPPORT_OFFICER", "SUPER_ADMIN"):
            raise ValidationError({"detail": "Only the ticket raiser or IT support can reopen this ticket."})
        if ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
            raise ValidationError({"detail": "Only resolved/closed tickets can be reopened."})
        ticket.status = TicketStatus.REOPENED
        ticket.save(update_fields=["status"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=False, methods=["get"], url_path="open")
    def open(self, request):
        qs = self.get_queryset().exclude(status__in=[TicketStatus.CLOSED])
        return Response(TicketListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="my-tickets")
    def my_tickets(self, request):
        qs = Ticket.objects.filter(raised_by=request.user).order_by("-raised_at")
        return Response(TicketListSerializer(qs, many=True).data)