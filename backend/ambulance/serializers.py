from rest_framework import serializers

from .models import (
    Ambulance, AmbulanceCrewMember, AmbulanceDispatch, DispatchCrewMember, AmbulanceMaintenanceLog,
)


class AmbulanceSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    active_dispatch = serializers.SerializerMethodField()

    class Meta:
        model = Ambulance
        fields = [
            "id", "registration_number", "ambulance_type", "make_model", "capacity",
            "base_fee", "rate_per_km", "status", "current_location", "is_active", "active_dispatch",
        ]

    def get_active_dispatch(self, obj):
        d = obj.dispatches.exclude(status__in=["COMPLETED", "CANCELLED"]).first()
        if not d:
            return None
        return {"dispatch_id": str(d.id), "dispatch_number": d.dispatch_number, "patient_name": d.patient_display_name}


class AmbulanceCrewMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    ambulance_registration = serializers.CharField(source="ambulance.registration_number", read_only=True)
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = AmbulanceCrewMember
        fields = ["id", "ambulance", "ambulance_registration", "user", "user_name", "role", "is_active"]


class DispatchCrewMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = DispatchCrewMember
        fields = ["id", "dispatch", "user", "user_name", "role"]
        read_only_fields = ["id", "dispatch"]


class AmbulanceMaintenanceLogSerializer(serializers.ModelSerializer):
    ambulance_registration = serializers.CharField(source="ambulance.registration_number", read_only=True)
    logged_by_name = serializers.CharField(source="logged_by.get_full_name", read_only=True)

    class Meta:
        model = AmbulanceMaintenanceLog
        fields = [
            "id", "ambulance", "ambulance_registration", "maintenance_type", "service_date",
            "odometer_reading", "vendor", "cost", "description", "logged_by", "logged_by_name",
        ]
        read_only_fields = ["id", "logged_by"]


class AmbulanceDispatchSerializer(serializers.ModelSerializer):
    ambulance_registration = serializers.CharField(source="ambulance.registration_number", read_only=True)
    patient_display_name = serializers.CharField(read_only=True)
    hospital_number = serializers.CharField(source="patient.hospital_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    crew = DispatchCrewMemberSerializer(many=True, read_only=True)
    estimated_fee = serializers.SerializerMethodField()

    class Meta:
        model = AmbulanceDispatch
        fields = [
            "id", "dispatch_number", "ambulance", "ambulance_registration", "patient",
            "patient_display_name", "hospital_number", "patient_name_freetext", "contact_phone",
            "dispatch_type", "pickup_location", "destination", "distance_km", "status",
            "requested_by", "requested_by_name", "requested_at", "dispatched_at",
            "picked_up_at", "completed_at", "notes", "invoice", "emergency_visit",
            "crew", "estimated_fee",
        ]
        read_only_fields = [
            "id", "dispatch_number", "requested_by", "status", "requested_at",
            "dispatched_at", "picked_up_at", "completed_at", "invoice",
        ]

    def get_estimated_fee(self, obj):
        from .services import compute_dispatch_fee
        return str(compute_dispatch_fee(obj))


class AmbulanceDispatchListSerializer(serializers.ModelSerializer):
    ambulance_registration = serializers.CharField(source="ambulance.registration_number", read_only=True)
    patient_display_name = serializers.CharField(read_only=True)

    class Meta:
        model = AmbulanceDispatch
        fields = [
            "id", "dispatch_number", "ambulance_registration", "patient_display_name",
            "dispatch_type", "status", "pickup_location", "destination", "requested_at",
        ]


class RequestDispatchSerializer(serializers.Serializer):
    ambulance = serializers.UUIDField(required=False, allow_null=True)
    patient = serializers.UUIDField(required=False, allow_null=True)
    patient_name_freetext = serializers.CharField(required=False, allow_blank=True, default="")
    contact_phone = serializers.CharField(required=False, allow_blank=True, default="")
    dispatch_type = serializers.ChoiceField(choices=["EMERGENCY_PICKUP", "INTER_FACILITY_TRANSFER", "DISCHARGE_TRANSPORT", "OTHER"])
    pickup_location = serializers.CharField()
    destination = serializers.CharField(default="Facility")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("patient") and not attrs.get("patient_name_freetext"):
            raise serializers.ValidationError("Either a registered patient or a free-text patient name is required.")
        return attrs


class UpdateDispatchStatusSerializer(serializers.Serializer):
    distance_km = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class AssignCrewSerializer(serializers.Serializer):
    user = serializers.UUIDField()
    role = serializers.ChoiceField(choices=["DRIVER", "PARAMEDIC", "NURSE"])