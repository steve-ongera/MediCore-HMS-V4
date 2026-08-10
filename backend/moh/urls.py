# moh/urls.py
from django.urls import path
from .views import (
    OPDReportView, InpatientCapacityReportView, MCHReportView, MortalityReportView,
    DiseaseSurveillanceReportView, LabRadiologyReportView, PharmacyCommoditiesReportView,
    TheatreEmergencyBloodReferralReportView,InpatientAdmissionDetailView, OPDVisitDetailView, DiseaseSurveillanceDetailView ,
    MortalityDetailView , PharmacyDispenseDetailView , MCHDeliveryDetailView , ReferralDetailView
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
    path("moh/inpatient-capacity/admissions/", InpatientAdmissionDetailView.as_view(), name="inpatient-admission-detail"),
    path("moh/opd/visits/", OPDVisitDetailView.as_view(), name="opd-visit-detail"),
    path("moh/disease-surveillance/diagnoses/", DiseaseSurveillanceDetailView.as_view(), name="disease-surveillance-detail"),
    path("moh/mortality/deaths/", MortalityDetailView.as_view(), name="mortality-detail"),
    path("moh/pharmacy-commodities/dispenses/", PharmacyDispenseDetailView.as_view(), name="pharmacy-dispense-detail"),
    path("moh/mch/deliveries/", MCHDeliveryDetailView.as_view(), name="mch-delivery-detail"),
    path("moh/theatre-emergency-blood-referral/referrals/", ReferralDetailView.as_view(), name="referral-detail"),
]