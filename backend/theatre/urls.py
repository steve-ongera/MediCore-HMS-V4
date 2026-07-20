from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    OperatingTheatreViewSet, SurgicalProcedureCatalogViewSet,
    SurgeryBookingViewSet, SurgeryViewSet,
)

router = DefaultRouter()
router.register(r"operating-theatres", OperatingTheatreViewSet, basename="operating-theatre")
router.register(r"surgical-procedure-catalog", SurgicalProcedureCatalogViewSet, basename="surgical-procedure-catalog")
router.register(r"surgery-bookings", SurgeryBookingViewSet, basename="surgery-booking")
router.register(r"surgeries", SurgeryViewSet, basename="surgery")

urlpatterns = [path("", include(router.urls))]