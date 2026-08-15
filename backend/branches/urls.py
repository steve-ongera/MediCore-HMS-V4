# branches/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BranchViewSet, BranchStaffAssignmentViewSet

router = DefaultRouter()
router.register(r"branches", BranchViewSet, basename="branch")
router.register(r"branch-staff-assignments", BranchStaffAssignmentViewSet, basename="branch-staff-assignment")
urlpatterns = [path("", include(router.urls))]