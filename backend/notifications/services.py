from api.models import User, Role
from .models import Notification, NotificationCategory, NotificationPriority


# Maps every NotificationType constant to a category, so producers don't
# need to specify both every time — keeps calls to notify() short.
_CATEGORY_MAP = {
    # a representative sample; extend as needed — fields below default to
    # SYSTEM if a type isn't mapped, so nothing ever throws for a missing entry
}


def notify(recipient, notification_type, title, message="", link="", priority=NotificationPriority.NORMAL, category=None, metadata=None):
    """The single function every module in the codebase should call to raise a notification for one user."""
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        category=category or NotificationCategory.SYSTEM,
        priority=priority,
        title=title,
        message=message,
        link=link,
        metadata=metadata or {},
    )


def notify_role(role, notification_type, title, message="", link="", priority=NotificationPriority.NORMAL, category=None, metadata=None):
    """Fan-out to every active user with a given role — e.g. every pharmacist when stock is low."""
    users = User.objects.filter(role=role, is_active_staff=True)
    return [
        notify(u, notification_type, title, message, link, priority, category, metadata)
        for u in users
    ]


def notify_super_admins(notification_type, title, message="", link="", priority=NotificationPriority.HIGH, category=None, metadata=None):
    return notify_role(Role.SUPER_ADMIN, notification_type, title, message, link, priority, category, metadata)


def notify_global(roles, notification_type, title, message="", link="", priority=NotificationPriority.NORMAL, category=None, metadata=None):
    """Fan-out to multiple roles at once — for hospital-wide announcements or cross-department alerts."""
    users = User.objects.filter(role__in=roles, is_active_staff=True)
    return [
        notify(u, notification_type, title, message, link, priority, category, metadata)
        for u in users
    ]