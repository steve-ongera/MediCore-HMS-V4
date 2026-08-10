class PACSGateway:
    """
    The seam between RIS workflow and the actual image source. Everything
    above this class (views, serializers, frontend) talks only to this
    interface — swapping MockPACSGateway for a real one (Orthanc, dcm4chee,
    a commercial PACS's REST API) requires zero changes anywhere else in
    the codebase.
    """

    def push_study_worklist_entry(self, study):
        """Registers a scheduled study on the Modality Worklist — real implementation sends a DICOM MWL entry so the physical scanner can query and auto-populate patient/study details."""
        raise NotImplementedError

    def simulate_or_receive_images(self, study, series_count=1, images_per_series=3):
        """Demo: generates placeholder images. Production: this becomes a webhook/poll handler that receives real C-STORE notifications from the PACS server and creates matching Series/DicomImage rows."""
        raise NotImplementedError

    def get_viewer_url(self, study):
        """Returns a URL the frontend can load to view the study's images — demo: our own simple viewer; production: often a real DICOM web viewer (e.g. OHIF) pointed at the PACS server's WADO endpoint."""
        raise NotImplementedError