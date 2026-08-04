# licensing/urls.py
from django.urls import path
from .views import FacilityLicenseView
urlpatterns = [path("facility-license/", FacilityLicenseView.as_view())]