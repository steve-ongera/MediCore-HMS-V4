from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InsurerViewSet, PatientInsurancePolicyViewSet, InsuranceClaimViewSet

router = DefaultRouter()
router.register(r"insurers", InsurerViewSet, basename="insurer")
router.register(r"insurance-policies", PatientInsurancePolicyViewSet, basename="insurance-policy")
router.register(r"insurance-claims", InsuranceClaimViewSet, basename="insurance-claim")

urlpatterns = [path("", include(router.urls))]