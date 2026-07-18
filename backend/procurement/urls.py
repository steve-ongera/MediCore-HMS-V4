from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PurchaseRequisitionViewSet, PurchaseOrderViewSet, GoodsReceiptViewSet,
    SupplierInvoiceViewSet, SupplierPaymentViewSet,
)

router = DefaultRouter()
router.register(r"purchase-requisitions", PurchaseRequisitionViewSet, basename="purchase-requisition")
router.register(r"purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register(r"goods-receipts", GoodsReceiptViewSet, basename="goods-receipt")
router.register(r"supplier-invoices", SupplierInvoiceViewSet, basename="supplier-invoice")
router.register(r"supplier-payments", SupplierPaymentViewSet, basename="supplier-payment")

urlpatterns = [path("", include(router.urls))]