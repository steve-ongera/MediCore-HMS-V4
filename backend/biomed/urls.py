# biomed/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentViewSet, ServiceRequestViewSet, MaintenanceRecordViewSet, CalibrationViewSet, SparePartViewSet, ServiceContractViewSet

router = DefaultRouter()
router.register(r"equipment", EquipmentViewSet, basename="equipment")
router.register(r"service-requests", ServiceRequestViewSet, basename="service-request")
router.register(r"maintenance-records", MaintenanceRecordViewSet, basename="maintenance-record")
router.register(r"calibrations", CalibrationViewSet, basename="calibration")
router.register(r"spare-parts", SparePartViewSet, basename="spare-part")
router.register(r"service-contracts", ServiceContractViewSet, basename="service-contract")
urlpatterns = [path("", include(router.urls))]