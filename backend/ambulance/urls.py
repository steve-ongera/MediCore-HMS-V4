from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AmbulanceViewSet, AmbulanceCrewMemberViewSet, AmbulanceDispatchViewSet, AmbulanceMaintenanceLogViewSet,
)

router = DefaultRouter()
router.register(r"ambulances", AmbulanceViewSet, basename="ambulance")
router.register(r"ambulance-crew", AmbulanceCrewMemberViewSet, basename="ambulance-crew")
router.register(r"ambulance-dispatches", AmbulanceDispatchViewSet, basename="ambulance-dispatch")
router.register(r"ambulance-maintenance", AmbulanceMaintenanceLogViewSet, basename="ambulance-maintenance")

urlpatterns = [path("", include(router.urls))]