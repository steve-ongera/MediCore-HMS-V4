#branches/mixins.py
from rest_framework.exceptions import ValidationError

from .permissions import get_accessible_branch_ids


class BranchScopedViewSetMixin:
    """
    Drop into any ViewSet whose model has a `branch` FK. Automatically:
    1. Filters list/retrieve querysets to only branches the user can access.
    2. Stamps new records with the user's branch on create (unless a
       GROUP_ADMIN explicitly specifies one, e.g. creating on behalf of
       a branch from a group-level screen).
    Usage: class VisitViewSet(BranchScopedViewSetMixin, BaseModelViewSet): ...
    Requires the model to have a `branch` field (direct or via
    branch_field_path for models where branch is one hop away, e.g.
    Invoice -> Invoice.visit.branch).
    """
    branch_field_path = "branch"  # override to e.g. "visit__branch" if branch isn't a direct FK on this model

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = get_accessible_branch_ids(self.request.user)
        if accessible is None:
            return qs  # GROUP_ADMIN / superuser — unrestricted
        return qs.filter(**{f"{self.branch_field_path}__in": accessible})

    def perform_create(self, serializer):
        accessible = get_accessible_branch_ids(self.request.user)
        requested_branch = self.request.data.get("branch")

        if accessible is None:
            # GROUP_ADMIN can create for any branch, but must specify one explicitly.
            if not requested_branch:
                raise ValidationError({"branch": "As a Group Admin, you must specify which branch this record belongs to."})
            serializer.save(branch_id=requested_branch)
            return

        # Regular staff — always stamped with their own primary branch,
        # never trusting a branch value the frontend might send, to
        # prevent a staff member from writing data into a branch they
        # don't belong to just by editing the request payload.
        serializer.save(branch_id=self.request.user.branch_id)