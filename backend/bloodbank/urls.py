from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BloodDonorViewSet, BloodDonationViewSet, BloodUnitViewSet, BloodRequestViewSet

router = DefaultRouter()
router.register(r"blood-donors", BloodDonorViewSet, basename="blood-donor")
router.register(r"blood-donations", BloodDonationViewSet, basename="blood-donation")
router.register(r"blood-units", BloodUnitViewSet, basename="blood-unit")
router.register(r"blood-requests", BloodRequestViewSet, basename="blood-request")

urlpatterns = [path("", include(router.urls))]