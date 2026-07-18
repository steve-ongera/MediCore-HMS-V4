from rest_framework import serializers

from .models import (
    AssetCategory, Asset, AssetMaintenance, AssetTransfer, AssetDisposal,
)


class AssetCategorySerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetCategory
        fields = ["id", "name", "description", "default_useful_life_years", "is_active", "asset_count"]

    def get_asset_count(self, obj):
        return obj.assets.filter(is_deleted=False).count()


class AssetMaintenanceSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.CharField(source="logged_by.get_full_name", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_tag = serializers.CharField(source="asset.asset_tag", read_only=True)

    class Meta:
        model = AssetMaintenance
        fields = [
            "id", "asset", "asset_name", "asset_tag", "maintenance_type", "status",
            "scheduled_date", "completed_date", "vendor", "cost", "description",
            "notes", "logged_by", "logged_by_name",
        ]
        read_only_fields = ["id", "logged_by"]


class AssetTransferSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_tag = serializers.CharField(source="asset.asset_tag", read_only=True)
    from_department_name = serializers.CharField(source="from_department.name", read_only=True)
    to_department_name = serializers.CharField(source="to_department.name", read_only=True)
    from_custodian_name = serializers.CharField(source="from_custodian.get_full_name", read_only=True)
    to_custodian_name = serializers.CharField(source="to_custodian.get_full_name", read_only=True)
    transferred_by_name = serializers.CharField(source="transferred_by.get_full_name", read_only=True)

    class Meta:
        model = AssetTransfer
        fields = [
            "id", "asset", "asset_name", "asset_tag", "from_department", "from_department_name",
            "to_department", "to_department_name", "from_custodian", "from_custodian_name",
            "to_custodian", "to_custodian_name", "reason", "transferred_by", "transferred_by_name",
            "transferred_at",
        ]
        read_only_fields = ["id", "transferred_by", "transferred_at", "from_department", "from_custodian"]


class AssetDisposalSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_tag = serializers.CharField(source="asset.asset_tag", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = AssetDisposal
        fields = [
            "id", "asset", "asset_name", "asset_tag", "disposal_date", "disposal_method",
            "disposal_value", "reason", "approved_by", "approved_by_name",
            "recorded_by", "recorded_by_name",
        ]
        read_only_fields = ["id", "recorded_by"]


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    registered_by_name = serializers.CharField(source="registered_by.get_full_name", read_only=True)
    current_value = serializers.SerializerMethodField()
    is_under_warranty = serializers.BooleanField(read_only=True)
    effective_useful_life_years = serializers.IntegerField(read_only=True)

    maintenance_records = AssetMaintenanceSerializer(many=True, read_only=True)
    transfers = AssetTransferSerializer(many=True, read_only=True)
    disposal = AssetDisposalSerializer(read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id", "asset_tag", "name", "category", "category_name", "description",
            "serial_number", "manufacturer", "model_number", "supplier", "supplier_name",
            "purchase_date", "purchase_cost", "useful_life_years", "effective_useful_life_years",
            "salvage_value", "current_value", "warranty_expiry", "is_under_warranty",
            "department", "department_name", "location_notes", "assigned_to", "assigned_to_name",
            "status", "condition", "registered_by", "registered_by_name",
            "maintenance_records", "transfers", "disposal", "created_at",
        ]
        read_only_fields = ["id", "asset_tag", "registered_by", "created_at"]

    def get_current_value(self, obj):
        return str(obj.current_value)


class AssetListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    current_value = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "id", "asset_tag", "name", "category_name", "department_name",
            "assigned_to_name", "status", "condition", "purchase_cost", "current_value",
        ]

    def get_current_value(self, obj):
        return str(obj.current_value)


class TransferAssetSerializer(serializers.Serializer):
    to_department = serializers.UUIDField(required=False, allow_null=True)
    to_custodian = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class DisposeAssetSerializer(serializers.Serializer):
    disposal_date = serializers.DateField()
    disposal_method = serializers.ChoiceField(choices=["SOLD", "SCRAPPED", "DONATED", "LOST", "STOLEN", "TRADE_IN"])
    disposal_value = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = serializers.CharField(required=False, allow_blank=True, default="")
    approved_by = serializers.UUIDField(required=False, allow_null=True)