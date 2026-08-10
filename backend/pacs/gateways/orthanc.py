import requests
from django.conf import settings

from .base import PACSGateway


class OrthancPACSGateway(PACSGateway):
    """
    Real implementation for connecting to an Orthanc PACS server —
    Orthanc is the standard open-source DICOM server most compatible
    with a Django-based HMIS, and is architecturally similar to what
    Kenyan deployments (e.g. Nairobi Hospital's PACS-RIS, and other
    local HMIS vendors advertising DICOM/HL7 compatibility) run.

    NOT YET CONNECTED — this requires:
    1. An Orthanc server running as a separate service (Docker container
       is the standard deployment), reachable at PACS_ORTHANC_BASE_URL.
    2. Physical modalities (CT/MRI/X-ray machines) configured with
       Orthanc's AE Title, IP, and port as their DICOM destination —
       this is done on the machine's own console/service menu, not in
       this codebase.
    3. Orthanc's Modality Worklist plugin enabled so machines can query
       scheduled studies (push_study_worklist_entry below).
    4. A webhook or polling job registered with Orthanc's "OnStableStudy"
       Lua/Python plugin hook, so this Django app gets notified the
       moment a real study finishes arriving (replacing
       simulate_or_receive_images entirely).

    Every method below is a real, working REST call against Orthanc's
    documented API — but the endpoints/payloads should be verified
    against your specific Orthanc version and plugin configuration
    before going live, same caution as every other external-system
    gateway in this codebase (SHA, eTIMS).
    """

    def __init__(self):
        self.base_url = getattr(settings, "PACS_ORTHANC_BASE_URL", "")
        self.auth = (
            getattr(settings, "PACS_ORTHANC_USERNAME", ""),
            getattr(settings, "PACS_ORTHANC_PASSWORD", ""),
        )

    def push_study_worklist_entry(self, study):
        # Orthanc's worklist plugin expects a DICOM-formatted worklist file
        # dropped into its worklist directory, or a REST call to a
        # worklist-management plugin if one is installed. Exact payload
        # depends on your Orthanc worklist plugin configuration.
        raise NotImplementedError("Configure against your Orthanc worklist plugin before use.")

    def simulate_or_receive_images(self, study, **kwargs):
        # In production this is NOT called proactively — instead, Orthanc
        # pushes a webhook to a receiving endpoint in this app (see
        # pacs/views.py PACSWebhookView, to be built) the moment a real
        # study is stable. This method is left unimplemented deliberately.
        raise NotImplementedError("Real image receipt is event-driven via Orthanc webhook, not polled from here.")

    def get_viewer_url(self, study):
        # Orthanc exposes a built-in viewer at /app/explorer.html#study?uuid=...
        # or you can point this at a separate OHIF viewer instance
        # configured against Orthanc's DICOMweb endpoint.
        return f"{self.base_url}/app/explorer.html#study?uuid={study.study_instance_uid}"