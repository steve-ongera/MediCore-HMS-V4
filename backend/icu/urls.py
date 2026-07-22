from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ICUBedViewSet, ICUProcedureCatalogViewSet, ICUAdmissionViewSet

router = DefaultRouter()
router.register(r"icu-beds", ICUBedViewSet, basename="icu-bed")
router.register(r"icu-procedure-catalog", ICUProcedureCatalogViewSet, basename="icu-procedure-catalog")
router.register(r"icu-admissions", ICUAdmissionViewSet, basename="icu-admission")

urlpatterns = [path("", include(router.urls))]