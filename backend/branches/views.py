# branches/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.permissions import IsSuperAdmin
from .permissions import IsGroupAdmin
from .models import Branch, BranchStaffAssignment
from .serializers import BranchSerializer, BranchStaffAssignmentSerializer


class BranchViewSet(viewsets.ModelViewSet):
    """Branch CRUD — Group Admin only. Regular Super Admins can view their own branch's details but not create/edit branches."""
    queryset = Branch.objects.filter(is_active=True)
    serializer_class = BranchSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsGroupAdmin()]
        return [IsSuperAdmin()]  # any branch-level Super Admin can list/view branches, e.g. for dropdowns

    @action(detail=False, methods=["get"], url_path="my-accessible")
    def my_accessible(self, request):
        """What the current user can switch between — powers the branch switcher in the navbar."""
        from .permissions import get_accessible_branch_ids
        accessible = get_accessible_branch_ids(request.user)
        qs = self.get_queryset() if accessible is None else self.get_queryset().filter(id__in=accessible)
        return Response(BranchSerializer(qs, many=True).data)


class BranchStaffAssignmentViewSet(viewsets.ModelViewSet):
    queryset = BranchStaffAssignment.objects.select_related("user", "branch", "granted_by").all()
    serializer_class = BranchStaffAssignmentSerializer
    permission_classes = [IsGroupAdmin]

    def perform_create(self, serializer):
        serializer.save(granted_by=self.request.user)