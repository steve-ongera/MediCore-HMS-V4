from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.views import BaseModelViewSet
from api.permissions import ReadOnlyOrSuperAdmin, IsCashierOrAccountant

from .models import FiscalizationConfig, FiscalizedReceipt, FiscalizationStatus
from .serializers import FiscalizationConfigSerializer, FiscalizedReceiptSerializer
from .services import retry_fiscalization


class FiscalizationConfigViewSet(BaseModelViewSet):
    queryset = FiscalizationConfig.objects.all()
    serializer_class = FiscalizationConfigSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]


class FiscalizedReceiptViewSet(BaseModelViewSet):
    queryset = FiscalizedReceipt.objects.select_related(
        "payment__invoice__patient", "otc_sale"
    ).prefetch_related("items").all()
    serializer_class = FiscalizedReceiptSerializer
    filterset_fields = ["status"]
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsCashierOrAccountant]

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Receipts are created automatically on Payment/OTCSale — not directly."}, status=405)

    @action(detail=False, methods=["get"], url_path="failed")
    def failed(self, request):
        qs = self.get_queryset().filter(status=FiscalizationStatus.FAILED)
        return Response(FiscalizedReceiptSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        receipt = self.get_object()
        retry_fiscalization(receipt)
        receipt.refresh_from_db()
        return Response(FiscalizedReceiptSerializer(receipt).data)