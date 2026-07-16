from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmergencyBayViewSet, EmergencyVisitViewSet, TriageVitalsViewSet, EmergencyNoteViewSet,
    EmergencyProcedureCatalogViewSet, EmergencyProcedureViewSet,
    EmergencyMedicationOrderViewSet, EmergencyMedicationAdministrationViewSet,
)

router = DefaultRouter()
router.register(r"emergency-bays", EmergencyBayViewSet, basename="emergency-bay")
router.register(r"emergency-visits", EmergencyVisitViewSet, basename="emergency-visit")
router.register(r"triage-vitals", TriageVitalsViewSet, basename="triage-vitals")
router.register(r"emergency-notes", EmergencyNoteViewSet, basename="emergency-note")
router.register(r"emergency-procedure-catalog", EmergencyProcedureCatalogViewSet, basename="emergency-procedure-catalog")
router.register(r"emergency-procedures", EmergencyProcedureViewSet, basename="emergency-procedure")
router.register(r"emergency-medication-orders", EmergencyMedicationOrderViewSet, basename="emergency-medication-order")
router.register(r"emergency-medication-administrations", EmergencyMedicationAdministrationViewSet, basename="emergency-medication-administration")

urlpatterns = [path("", include(router.urls))]