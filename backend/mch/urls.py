from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AntenatalProfileViewSet, ANCVisitViewSet, DeliveryRecordViewSet,
    PostnatalVisitViewSet, ChildViewSet, VaccineCatalogViewSet,
    ChildImmunizationViewSet, GrowthMonitoringViewSet,
)

router = DefaultRouter()
router.register(r"antenatal-profiles", AntenatalProfileViewSet, basename="antenatal-profile")
router.register(r"anc-visits", ANCVisitViewSet, basename="anc-visit")
router.register(r"delivery-records", DeliveryRecordViewSet, basename="delivery-record")
router.register(r"postnatal-visits", PostnatalVisitViewSet, basename="postnatal-visit")
router.register(r"children", ChildViewSet, basename="child")
router.register(r"vaccine-catalog", VaccineCatalogViewSet, basename="vaccine-catalog")
router.register(r"child-immunizations", ChildImmunizationViewSet, basename="child-immunization")
router.register(r"growth-monitoring", GrowthMonitoringViewSet, basename="growth-monitoring")

urlpatterns = [path("", include(router.urls))]