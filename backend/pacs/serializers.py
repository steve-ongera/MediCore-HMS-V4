from rest_framework import serializers
from .models import Study, Series, DicomImage, RadiologyReport


class DicomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DicomImage
        fields = ["id", "sop_instance_uid", "instance_number", "file", "external_reference", "is_simulated", "received_at"]


class SeriesSerializer(serializers.ModelSerializer):
    images = DicomImageSerializer(many=True, read_only=True)

    class Meta:
        model = Series
        fields = ["id", "series_instance_uid", "series_number", "series_description", "modality", "images", "created_at_display"]


class RadiologyReportSerializer(serializers.ModelSerializer):
    radiologist_name = serializers.CharField(source="radiologist.get_full_name", read_only=True)

    class Meta:
        model = RadiologyReport
        fields = ["id", "study", "radiologist", "radiologist_name", "findings", "impression", "status", "finalized_at", "created_at_display"]
        read_only_fields = ["id", "study", "radiologist", "finalized_at", "created_at_display"]


class StudySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    referring_physician_name = serializers.CharField(source="referring_physician.get_full_name", read_only=True)
    performing_technologist_name = serializers.CharField(source="performing_technologist.get_full_name", read_only=True)
    series_set = SeriesSerializer(many=True, read_only=True)
    report = RadiologyReportSerializer(read_only=True)
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = Study
        fields = [
            "id", "study_instance_uid", "accession_number", "patient", "patient_name", "hospital_number",
            "radiology_order", "modality", "description", "status", "referring_physician",
            "referring_physician_name", "performing_technologist", "performing_technologist_name",
            "study_date", "scheduled_at", "source", "series_set", "report", "image_count",
        ]
        read_only_fields = ["id", "study_instance_uid", "accession_number", "status", "study_date", "scheduled_at", "source"]

    def get_image_count(self, obj):
        return sum(s.images.count() for s in obj.series_set.all())


class StudyListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = Study
        fields = ["id", "accession_number", "patient_name", "modality", "description", "status", "source", "scheduled_at", "has_report"]

    def get_has_report(self, obj):
        return hasattr(obj, "report")


class ScheduleStudySerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    modality = serializers.ChoiceField(choices=["CR", "CT", "MR", "US", "MG", "DX", "OT"])
    description = serializers.CharField(max_length=255)
    radiology_order = serializers.UUIDField(required=False, allow_null=True)
    referring_physician = serializers.UUIDField(required=False, allow_null=True)


class SimulateImagesSerializer(serializers.Serializer):
    series_count = serializers.IntegerField(min_value=1, max_value=5, default=1)
    images_per_series = serializers.IntegerField(min_value=1, max_value=20, default=3)


class ReportInputSerializer(serializers.Serializer):
    findings = serializers.CharField(required=False, allow_blank=True, default="")
    impression = serializers.CharField(required=False, allow_blank=True, default="")