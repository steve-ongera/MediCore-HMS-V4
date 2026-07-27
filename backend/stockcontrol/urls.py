# stockcontrol/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreLocationViewSet, StockTransferRequestViewSet, StockCountViewSet

router = DefaultRouter()
router.register(r"store-locations", StoreLocationViewSet, basename="store-location")
router.register(r"stock-transfers", StockTransferRequestViewSet, basename="stock-transfer")
router.register(r"stock-counts", StockCountViewSet, basename="stock-count")

urlpatterns = [path("", include(router.urls))]