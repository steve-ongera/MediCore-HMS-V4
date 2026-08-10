from django.utils import timezone

from .base import PACSGateway
from ..models import Series, DicomImage, StudyStatus


class MockPACSGateway(PACSGateway):
    """
    Demonstration gateway — simulates what happens when a real modality
    performs a scan and pushes images to PACS. No real DICOM network
    traffic occurs; this exists purely to demonstrate the RIS workflow
    (order -> scheduled -> images received -> report) end-to-end without
    needing physical equipment connected.
    """

    PLACEHOLDER_IMAGE_PATH = "pacs/placeholders/sample_scan.png"  # a static placeholder shipped with the app — see note below

    def push_study_worklist_entry(self, study):
        # No-op in demo mode — there's no real modality to notify.
        return {"success": True, "simulated": True, "detail": "Worklist entry simulated (no real modality connected)."}

    def simulate_or_receive_images(self, study, series_count=1, images_per_series=3):
        created_series = []
        for s_num in range(1, series_count + 1):
            series = Series.objects.create(
                study=study, series_number=s_num,
                series_description=f"Simulated {study.get_modality_display()} Series {s_num}",
                modality=study.modality,
            )
            for i_num in range(1, images_per_series + 1):
                DicomImage.objects.create(
                    series=series, instance_number=i_num,
                    file=self.PLACEHOLDER_IMAGE_PATH, is_simulated=True,
                )
            created_series.append(series)

        study.status = StudyStatus.COMPLETED
        study.study_date = timezone.now()
        study.save(update_fields=["status", "study_date"])

        return {"success": True, "simulated": True, "series_created": len(created_series)}

    def get_viewer_url(self, study):
        # Points at our own internal viewer page, not an external DICOM viewer.
        return f"/pacs/studies/{study.id}/viewer"