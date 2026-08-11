# doctormgmt/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorProfileViewSet, DoctorScheduleViewSet, DoctorHolidayViewSet, DoctorCommissionViewSet

router = DefaultRouter()
router.register(r"doctor-profiles", DoctorProfileViewSet, basename="doctor-profile")
router.register(r"doctor-schedules", DoctorScheduleViewSet, basename="doctor-schedule")
router.register(r"doctor-holidays", DoctorHolidayViewSet, basename="doctor-holiday")
router.register(r"doctor-commissions", DoctorCommissionViewSet, basename="doctor-commission")
urlpatterns = [path("", include(router.urls))]