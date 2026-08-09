# moh/urls.py
from django.urls import path
from .views import (
    OPDReportView, InpatientCapacityReportView, MCHReportView, MortalityReportView,
    DiseaseSurveillanceReportView, LabRadiologyReportView, PharmacyCommoditiesReportView,
    TheatreEmergencyBloodReferralReportView,
)

urlpatterns = [
    path("moh/opd/", OPDReportView.as_view()),
    path("moh/inpatient-capacity/", InpatientCapacityReportView.as_view()),
    path("moh/mch/", MCHReportView.as_view()),
    path("moh/mortality/", MortalityReportView.as_view()),
    path("moh/disease-surveillance/", DiseaseSurveillanceReportView.as_view()),
    path("moh/lab-radiology/", LabRadiologyReportView.as_view()),
    path("moh/pharmacy-commodities/", PharmacyCommoditiesReportView.as_view()),
    path("moh/theatre-emergency-blood-referral/", TheatreEmergencyBloodReferralReportView.as_view()),
]