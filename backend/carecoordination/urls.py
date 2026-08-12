# carecoordination/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CarePlanViewSet, FollowUpTaskViewSet

router = DefaultRouter()
router.register(r"care-plans", CarePlanViewSet, basename="care-plan")
router.register(r"follow-up-tasks", FollowUpTaskViewSet, basename="follow-up-task")
urlpatterns = [path("", include(router.urls))]