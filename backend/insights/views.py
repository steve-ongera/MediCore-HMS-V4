# insights/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from api.permissions import IsAccountant
from .models import BusinessInsight
from .serializers import BusinessInsightSerializer
from .services import generate_insights


class BusinessInsightViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BusinessInsight.objects.select_related("acknowledged_by").all()
    serializer_class = BusinessInsightSerializer
    permission_classes = [IsAccountant]
    filterset_fields = ["category", "severity", "is_stale"]

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(is_stale=False).order_by("-severity", "-generated_at")
        return Response(BusinessInsightSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="generate-now")
    def generate_now(self, request):
        insights = generate_insights()
        return Response({"generated": len(insights)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        insight = self.get_object()
        insight.acknowledged_by = request.user
        insight.acknowledged_at = timezone.now()
        insight.save(update_fields=["acknowledged_by", "acknowledged_at"])
        return Response(BusinessInsightSerializer(insight).data)