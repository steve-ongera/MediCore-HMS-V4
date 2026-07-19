from rest_framework import serializers

from .models import (
    MortuaryUnit, MortuaryAdmission, MortuaryServiceCatalog, MortuaryServiceRecord,
    MortuaryCharge, BodyRelease,
)


class MortuaryUnitSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    current_case = serializers.SerializerMethodField()

    class Meta:
        model = MortuaryUnit
        fields = ["id", "compartment_number", "daily_storage_rate", "status", "is_active", "current_case"]

    def get_current_case(self, obj):
        case = obj.admissions.filter(status="ADMITTED").first()
        if not case:
            return None
        return {"case_id": str(case.id), "case_number": case.case_number, "deceased_name": case.deceased_display_name}


class MortuaryServiceCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = MortuaryServiceCatalog
        fields = ["id", "code", "name", "price", "is_active"]


class MortuaryServiceRecordSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_price = serializers.DecimalField(source="service.price", max_digits=10, decimal_places=2, read_only=True)
    ordered_by_name = serializers.CharField(source="ordered_by.get_full_name", read_only=True)

    class Meta:
        model = MortuaryServiceRecord
        fields = [
            "id", "mortuary_case", "service", "service_name", "service_price", "status",
            "notes", "ordered_by", "ordered_by_name", "performed_by", "invoice", "ordered_at", "completed_at",
        ]
        read_only_fields = ["id", "ordered_by", "invoice", "ordered_at", "completed_at"]


class MortuaryChargeSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    amount = serializers.DecimalField(source="invoice.amount", max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(source="invoice.balance", max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(source="invoice.status", read_only=True)

    class Meta:
        model = MortuaryCharge
        fields = ["id", "mortuary_case", "invoice", "invoice_number", "description", "amount", "balance", "status", "created_at_display"]


class BodyReleaseSerializer(serializers.ModelSerializer):
    released_by_name = serializers.CharField(source="released_by.get_full_name", read_only=True)

    class Meta:
        model = BodyRelease
        fields = [
            "id", "mortuary_case", "collector_name", "collector_id_number", "collector_phone",
            "relationship", "funeral_home", "burial_permit_number", "released_by",
            "released_by_name", "notes", "released_at",
        ]
        read_only_fields = ["id", "mortuary_case", "released_by", "released_at"]


class MortuaryAdmissionSerializer(serializers.ModelSerializer):
    deceased_display_name = serializers.CharField(read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    compartment_number = serializers.CharField(source="compartment.compartment_number", read_only=True)
    admitted_by_name = serializers.CharField(source="admitted_by.get_full_name", read_only=True)
    days_in_storage = serializers.IntegerField(read_only=True)

    services = MortuaryServiceRecordSerializer(many=True, read_only=True)
    charges = MortuaryChargeSerializer(many=True, read_only=True)
    release = BodyReleaseSerializer(read_only=True)

    class Meta:
        model = MortuaryAdmission
        fields = [
            "id", "case_number", "patient", "deceased_display_name", "hospital_number",
            "deceased_name_freetext", "gender", "estimated_age", "date_of_death",
            "cause_of_death", "source", "admission", "emergency_visit", "delivery_record",
            "compartment", "compartment_number", "brought_by", "police_ob_number",
            "status", "admitted_by", "admitted_by_name", "admitted_at", "days_in_storage",
            "services", "charges", "release",
        ]
        read_only_fields = ["id", "case_number", "status", "admitted_by", "admitted_at"]


class MortuaryAdmissionListSerializer(serializers.ModelSerializer):
    deceased_display_name = serializers.CharField(read_only=True)
    compartment_number = serializers.CharField(source="compartment.compartment_number", read_only=True)
    days_in_storage = serializers.IntegerField(read_only=True)

    class Meta:
        model = MortuaryAdmission
        fields = [
            "id", "case_number", "deceased_display_name", "compartment_number",
            "source", "status", "date_of_death", "admitted_at", "days_in_storage",
        ]


class RegisterMortuaryCaseSerializer(serializers.Serializer):
    patient = serializers.UUIDField(required=False, allow_null=True)
    deceased_name_freetext = serializers.CharField(required=False, allow_blank=True, default="")
    gender = serializers.ChoiceField(choices=["MALE", "FEMALE", "UNKNOWN"], default="UNKNOWN")
    estimated_age = serializers.IntegerField(required=False, allow_null=True)
    date_of_death = serializers.DateTimeField()
    cause_of_death = serializers.CharField(required=False, allow_blank=True, default="")
    source = serializers.ChoiceField(choices=["INPATIENT", "EMERGENCY", "MCH", "BROUGHT_IN_DEAD", "OTHER"])
    admission = serializers.UUIDField(required=False, allow_null=True)
    emergency_visit = serializers.UUIDField(required=False, allow_null=True)
    delivery_record = serializers.UUIDField(required=False, allow_null=True)
    compartment = serializers.UUIDField(required=False, allow_null=True)
    brought_by = serializers.CharField(required=False, allow_blank=True, default="")
    police_ob_number = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("patient") and not attrs.get("deceased_name_freetext"):
            raise serializers.ValidationError("Either a registered patient or a free-text deceased name is required.")
        return attrs


class OrderMortuaryServiceSerializer(serializers.Serializer):
    service = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class ReleaseBodySerializer(serializers.Serializer):
    collector_name = serializers.CharField()
    collector_id_number = serializers.CharField(required=False, allow_blank=True, default="")
    collector_phone = serializers.CharField(required=False, allow_blank=True, default="")
    relationship = serializers.ChoiceField(choices=[
        "SPOUSE", "CHILD", "PARENT", "SIBLING", "OTHER_RELATIVE", "UNDERTAKER", "POLICE", "OTHER",
    ])
    funeral_home = serializers.CharField(required=False, allow_blank=True, default="")
    burial_permit_number = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AddMortuaryChargeSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)