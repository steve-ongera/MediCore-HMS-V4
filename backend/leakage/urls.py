# leakage/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RevenueLeakageRecordViewSet, LeakageDashboardView

router = DefaultRouter()
router.register(r"revenue-leakage", RevenueLeakageRecordViewSet, basename="revenue-leakage")

urlpatterns = [
    path("revenue-leakage/dashboard/", LeakageDashboardView.as_view(), name="leakage-dashboard"),
    path("", include(router.urls)),
]