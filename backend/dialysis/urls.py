from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DialysisMachineViewSet, DialysisPatientProfileViewSet, DialysisSessionViewSet

router = DefaultRouter()
router.register(r"dialysis-machines", DialysisMachineViewSet, basename="dialysis-machine")
router.register(r"dialysis-patients", DialysisPatientProfileViewSet, basename="dialysis-patient")
router.register(r"dialysis-sessions", DialysisSessionViewSet, basename="dialysis-session")

urlpatterns = [path("", include(router.urls))]