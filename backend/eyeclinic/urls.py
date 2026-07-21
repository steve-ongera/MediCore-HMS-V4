from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EyeProcedureCatalogViewSet, EyeVisitViewSet, EyeTreatmentPlanViewSet

router = DefaultRouter()
router.register(r"eye-procedure-catalog", EyeProcedureCatalogViewSet, basename="eye-procedure-catalog")
router.register(r"eye-visits", EyeVisitViewSet, basename="eye-visit")
router.register(r"eye-treatment-plans", EyeTreatmentPlanViewSet, basename="eye-treatment-plan")

urlpatterns = [path("", include(router.urls))]