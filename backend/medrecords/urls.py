# medrecords/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientFileViewSet, DocumentAttachmentViewSet, BirthRegisterViewSet,
    DeathRegisterViewSet, ReferralViewSet, DischargeSummaryViewSet,
    RecordRequestViewSet, RecordAuditTrailViewSet, MedRecordsStatsView , ICDCodingReviewViewSet
)

router = DefaultRouter()
router.register(r"patient-files", PatientFileViewSet, basename="patient-file")
router.register(r"document-attachments", DocumentAttachmentViewSet, basename="document-attachment")
router.register(r"birth-register", BirthRegisterViewSet, basename="birth-register")
router.register(r"death-register", DeathRegisterViewSet, basename="death-register")
router.register(r"referrals", ReferralViewSet, basename="referral")
router.register(r"discharge-summaries", DischargeSummaryViewSet, basename="discharge-summary")
router.register(r"record-requests", RecordRequestViewSet, basename="record-request")
router.register(r"record-audit-trail", RecordAuditTrailViewSet, basename="record-audit-trail")
router.register(r"icd-coding-review", ICDCodingReviewViewSet, basename="icd-coding-review")
urlpatterns = [path("", include(router.urls))]

urlpatterns += [path("medrecords/stats/", MedRecordsStatsView.as_view())]