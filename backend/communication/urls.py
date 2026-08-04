# communication/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnnouncementViewSet, MyAnnouncementsViewSet

router = DefaultRouter()
router.register(r"announcements", AnnouncementViewSet, basename="announcement")
router.register(r"my-announcements", MyAnnouncementsViewSet, basename="my-announcement")
urlpatterns = [path("", include(router.urls))]