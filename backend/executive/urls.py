# executive/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RefundViewSet, BillCancellationViewSet, ExecutiveDashboardView

router = DefaultRouter()
router.register(r"refunds", RefundViewSet, basename="refund")
router.register(r"bill-cancellations", BillCancellationViewSet, basename="bill-cancellation")

urlpatterns = [
    path("executive/dashboard/", ExecutiveDashboardView.as_view(), name="executive-dashboard"),
    path("", include(router.urls)),
]