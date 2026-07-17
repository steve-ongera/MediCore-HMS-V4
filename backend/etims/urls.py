from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import FiscalizationConfigViewSet, FiscalizedReceiptViewSet

router = DefaultRouter()
router.register(r"fiscalization-config", FiscalizationConfigViewSet, basename="fiscalization-config")
router.register(r"fiscalized-receipts", FiscalizedReceiptViewSet, basename="fiscalized-receipt")

urlpatterns = [path("", include(router.urls))]