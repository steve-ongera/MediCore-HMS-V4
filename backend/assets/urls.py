from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AssetCategoryViewSet, AssetViewSet, AssetMaintenanceViewSet,
    AssetTransferViewSet, AssetDisposalViewSet,
)

router = DefaultRouter()
router.register(r"asset-categories", AssetCategoryViewSet, basename="asset-category")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"asset-maintenance", AssetMaintenanceViewSet, basename="asset-maintenance")
router.register(r"asset-transfers", AssetTransferViewSet, basename="asset-transfer")
router.register(r"asset-disposals", AssetDisposalViewSet, basename="asset-disposal")

urlpatterns = [path("", include(router.urls))]