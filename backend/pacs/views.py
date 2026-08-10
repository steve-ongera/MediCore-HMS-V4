from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.permissions import HasRole
from api.models import Role, Patient

from .models import Study, StudyStatus, RadiologyReport, ReportStatus
from .serializers import (
    StudySerializer, StudyListSerializer, ScheduleStudySerializer,
    SimulateImagesSerializer, ReportInputSerializer, RadiologyReportSerializer,
)
from .services import get_gateway


class IsRadiologyStaff(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.RADIOLOGIST, Role.DOCTOR]
        return super().has_permission(request, view)


class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.select_related("patient", "referring_physician", "performing_technologist").prefetch_related("series_set__images", "report").all()
    permission_classes = [IsRadiologyStaff]
    filterset_fields = ["status", "modality", "source"]
    search_fields = ["accession_number", "patient__full_name", "patient__hospital_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return StudyListSerializer if self.action == "list" else StudySerializer

    def create(self, request, *args, **kwargs):
        """Schedules a study — in production this is also the point where push_study_worklist_entry notifies a real modality."""
        serializer = ScheduleStudySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        study = Study.objects.create(
            patient=patient, modality=data["modality"], description=data["description"],
            radiology_order_id=data.get("radiology_order"), referring_physician_id=data.get("referring_physician"),
        )

        gateway = get_gateway()
        gateway.push_study_worklist_entry(study)

        return Response(StudySerializer(study).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="simulate-images")
    def simulate_images(self, request, pk=None):
        """
        DEMO ONLY — manually triggers the mock gateway to generate
        placeholder images, standing in for a real modality performing the
        scan and pushing DICOM images to PACS. This action has no
        equivalent once PACS_MODE=REAL — real image arrival is event-driven
        from the modality itself, not manually triggered from the RIS side.
        """
        study = self.get_object()
        if study.status not in (StudyStatus.SCHEDULED, StudyStatus.IN_PROGRESS):
            raise ValidationError({"detail": "Images can only be simulated for scheduled/in-progress studies."})

        serializer = SimulateImagesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        gateway = get_gateway()
        result = gateway.simulate_or_receive_images(study, **serializer.validated_data)

        return Response({**result, "study": StudySerializer(study).data})

    @action(detail=True, methods=["get"], url_path="viewer-url")
    def viewer_url(self, request, pk=None):
        study = self.get_object()
        gateway = get_gateway()
        return Response({"viewer_url": gateway.get_viewer_url(study)})

    @action(detail=True, methods=["post"], url_path="save-report")
    def save_report(self, request, pk=None):
        study = self.get_object()
        serializer = ReportInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report, _ = RadiologyReport.objects.get_or_create(
            study=study, defaults={"radiologist": request.user},
        )
        if report.status == ReportStatus.FINAL:
            raise ValidationError({"detail": "This report is already finalized and cannot be edited. Use an addendum instead."})

        report.findings = serializer.validated_data["findings"]
        report.impression = serializer.validated_data["impression"]
        report.radiologist = request.user
        report.save()

        return Response(RadiologyReportSerializer(report).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="finalize-report")
    def finalize_report(self, request, pk=None):
        study = self.get_object()
        if not hasattr(study, "report"):
            raise ValidationError({"detail": "No report exists yet for this study."})

        from django.utils import timezone
        report = study.report
        report.status = ReportStatus.FINAL
        report.finalized_at = timezone.now()
        report.save(update_fields=["status", "finalized_at"])

        with transaction.atomic():
            study.status = StudyStatus.REPORTED
            study.save(update_fields=["status"])

        return Response(RadiologyReportSerializer(report).data)

    @action(detail=False, methods=["get"], url_path="worklist")
    def worklist(self, request):
        """Studies awaiting imaging — the RIS-side worklist view, matching what a real modality would query via DICOM MWL."""
        qs = self.get_queryset().filter(status__in=[StudyStatus.SCHEDULED, StudyStatus.IN_PROGRESS])
        return Response(StudyListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="pending-reports")
    def pending_reports(self, request):
        qs = self.get_queryset().filter(status=StudyStatus.COMPLETED)
        return Response(StudyListSerializer(qs, many=True).data)