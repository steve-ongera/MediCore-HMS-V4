# insights/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessInsightViewSet

router = DefaultRouter()
router.register(r"business-insights", BusinessInsightViewSet, basename="business-insight")
urlpatterns = [path("", include(router.urls))]