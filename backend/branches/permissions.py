from rest_framework.permissions import BasePermission
from api.models import Role


def get_accessible_branch_ids(user):
    """
    The single source of truth for 'which branches can this user see.'
    GROUP_ADMIN (and true Django superusers, per the licensing module's
    same is_superuser convention) see everything. Everyone else sees
    their primary branch plus any explicitly granted additional branches
    via BranchStaffAssignment.
    """
    if user.is_superuser or user.role == Role.GROUP_ADMIN:
        return None  # None = unrestricted, matches Django's ORM convention of "don't filter"

    branch_ids = set()
    if user.branch_id:
        branch_ids.add(user.branch_id)

    from .models import BranchStaffAssignment
    from django.utils import timezone
    extra = BranchStaffAssignment.objects.filter(user=user).filter(
        models_Q_expires_ok=True  # placeholder, real filter below
    ) if False else BranchStaffAssignment.objects.filter(user=user)

    now = timezone.now()
    for assignment in extra:
        if assignment.expires_at is None or assignment.expires_at > now:
            branch_ids.add(assignment.branch_id)

    return list(branch_ids)


class IsGroupAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == Role.GROUP_ADMIN or request.user.is_superuser))