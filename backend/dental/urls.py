from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DentalProcedureCatalogViewSet, DentalVisitViewSet, DentalTreatmentPlanViewSet

router = DefaultRouter()
router.register(r"dental-procedure-catalog", DentalProcedureCatalogViewSet, basename="dental-procedure-catalog")
router.register(r"dental-visits", DentalVisitViewSet, basename="dental-visit")
router.register(r"dental-treatment-plans", DentalTreatmentPlanViewSet, basename="dental-treatment-plan")

urlpatterns = [path("", include(router.urls))]