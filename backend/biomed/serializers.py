from rest_framework import serializers
from .models import Equipment, ServiceRequest, MaintenanceRecord, Calibration, SparePart, SparePartUsage, ServiceContract


class EquipmentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    is_active = serializers.BooleanField(default=True)
    next_preventive_maintenance_due = serializers.DateField(read_only=True)
    next_calibration_due = serializers.DateField(read_only=True)
    last_preventive_maintenance = serializers.DateTimeField(read_only=True)
    last_calibration = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Equipment
        fields = [
            "id", "asset_tag", "name", "category", "manufacturer", "model_number", "serial_number",
            "department", "risk_class", "status", "supplier", "supplier_name", "purchase_date",
            "purchase_cost", "warranty_expiry", "preventive_maintenance_interval_days",
            "calibration_interval_days", "is_active",
            "next_preventive_maintenance_due", "next_calibration_due",
            "last_preventive_maintenance", "last_calibration",
        ]
        read_only_fields = ["id", "asset_tag"]


class EquipmentListSerializer(serializers.ModelSerializer):
    next_preventive_maintenance_due = serializers.DateField(read_only=True)
    next_calibration_due = serializers.DateField(read_only=True)

    class Meta:
        model = Equipment
        fields = ["id", "asset_tag", "name", "category", "department", "status", "risk_class", "next_preventive_maintenance_due", "next_calibration_due"]


class ServiceRequestSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    equipment_tag = serializers.CharField(source="equipment.asset_tag", read_only=True)
    reported_by_name = serializers.CharField(source="reported_by.get_full_name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    downtime_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            "id", "request_number", "equipment", "equipment_name", "equipment_tag", "reported_by",
            "reported_by_name", "priority", "problem_description", "status", "assigned_to",
            "assigned_to_name", "reported_at", "resolved_at", "caused_downtime", "downtime_hours",
        ]
        read_only_fields = ["id", "request_number", "reported_by", "reported_at", "resolved_at"]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id", "equipment", "equipment_name", "service_request", "maintenance_type", "status",
            "scheduled_date", "performed_by", "performed_by_name", "work_done", "parts_used", "cost", "completed_at",
        ]
        read_only_fields = ["id", "completed_at"]


class CalibrationSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = Calibration
        fields = [
            "id", "equipment", "equipment_name", "scheduled_date", "status", "performed_by",
            "performed_by_name", "calibrated_at", "reference_standard", "result_notes", "certificate_number",
        ]
        read_only_fields = ["id", "calibrated_at"]


class SparePartSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = SparePart
        fields = ["id", "part_number", "name", "compatible_equipment", "quantity_in_stock", "reorder_level", "unit_cost", "supplier", "supplier_name", "is_low_stock"]


class ServiceContractSerializer(serializers.ModelSerializer):
    is_expiring_soon = serializers.BooleanField(read_only=True)
    equipment_names = serializers.SerializerMethodField()

    class Meta:
        model = ServiceContract
        fields = ["id", "contract_number", "vendor_name", "vendor_contact", "equipment", "equipment_names", "start_date", "end_date", "coverage_details", "annual_cost", "is_active", "is_expiring_soon"]

    def get_equipment_names(self, obj):
        return [e.name for e in obj.equipment.all()]