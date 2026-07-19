from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MortuaryUnitViewSet, MortuaryServiceCatalogViewSet, MortuaryAdmissionViewSet

router = DefaultRouter()
router.register(r"mortuary-units", MortuaryUnitViewSet, basename="mortuary-unit")
router.register(r"mortuary-service-catalog", MortuaryServiceCatalogViewSet, basename="mortuary-service-catalog")
router.register(r"mortuary-admissions", MortuaryAdmissionViewSet, basename="mortuary-admission")

urlpatterns = [path("", include(router.urls))]