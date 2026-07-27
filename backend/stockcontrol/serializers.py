from rest_framework import serializers
from .models import (
    StoreLocation, StoreStock, StockTransferRequest, StockTransferItem,
    StockCount, StockCountLine,
)


class StoreLocationSerializer(serializers.ModelSerializer):
    custodian_name = serializers.CharField(source="custodian.get_full_name", read_only=True)
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = StoreLocation
        fields = ["id", "name", "location_type", "custodian", "custodian_name", "is_active"]


class StoreStockSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = StoreStock
        fields = ["id", "location", "location_name", "medicine", "medicine_name", "quantity_on_hand"]


class StockTransferItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    has_discrepancy = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockTransferItem
        fields = ["id", "transfer", "medicine", "medicine_name", "quantity_requested", "quantity_dispatched", "quantity_received", "batch", "has_discrepancy"]
        read_only_fields = ["id", "transfer"]


class StockTransferRequestSerializer(serializers.ModelSerializer):
    from_location_name = serializers.CharField(source="from_location.name", read_only=True)
    to_location_name = serializers.CharField(source="to_location.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    dispatched_by_name = serializers.CharField(source="dispatched_by.get_full_name", read_only=True)
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True)
    items = StockTransferItemSerializer(many=True, read_only=True)
    has_any_discrepancy = serializers.SerializerMethodField()

    class Meta:
        model = StockTransferRequest
        fields = [
            "id", "transfer_number", "from_location", "from_location_name", "to_location", "to_location_name",
            "status", "requested_by", "requested_by_name", "approved_by", "approved_by_name",
            "dispatched_by", "dispatched_by_name", "received_by", "received_by_name",
            "requested_at", "approved_at", "dispatched_at", "received_at", "notes", "items", "has_any_discrepancy",
        ]
        read_only_fields = [
            "id", "transfer_number", "status", "requested_by", "approved_by", "dispatched_by", "received_by",
            "requested_at", "approved_at", "dispatched_at", "received_at",
        ]

    def get_has_any_discrepancy(self, obj):
        return any(i.has_discrepancy for i in obj.items.all())


class StockTransferListSerializer(serializers.ModelSerializer):
    from_location_name = serializers.CharField(source="from_location.name", read_only=True)
    to_location_name = serializers.CharField(source="to_location.name", read_only=True)

    class Meta:
        model = StockTransferRequest
        fields = ["id", "transfer_number", "from_location_name", "to_location_name", "status", "requested_at"]


class CreateTransferItemSerializer(serializers.Serializer):
    medicine = serializers.UUIDField()
    quantity_requested = serializers.IntegerField(min_value=1)


class CreateTransferSerializer(serializers.Serializer):
    from_location = serializers.UUIDField()
    to_location = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = CreateTransferItemSerializer(many=True, min_length=1)


class DispatchTransferSerializer(serializers.Serializer):
    quantities = serializers.DictField(child=serializers.IntegerField(min_value=0))


class ReceiveTransferSerializer(serializers.Serializer):
    quantities = serializers.DictField(child=serializers.IntegerField(min_value=0))


class StockCountLineSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = StockCountLine
        fields = ["id", "stock_count", "medicine", "medicine_name", "system_quantity", "counted_quantity", "variance", "explanation"]
        read_only_fields = ["id", "stock_count", "system_quantity", "variance"]


class StockCountSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    counted_by_name = serializers.CharField(source="counted_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    lines = StockCountLineSerializer(many=True, read_only=True)
    has_variance = serializers.SerializerMethodField()

    class Meta:
        model = StockCount
        fields = [
            "id", "count_number", "location", "location_name", "counted_by", "counted_by_name",
            "status", "approved_by", "approved_by_name", "started_at", "submitted_at", "approved_at",
            "notes", "lines", "has_variance",
        ]
        read_only_fields = ["id", "count_number", "counted_by", "status", "approved_by", "started_at", "submitted_at", "approved_at"]

    def get_has_variance(self, obj):
        return any(l.variance != 0 for l in obj.lines.all())


class SubmitCountLineSerializer(serializers.Serializer):
    medicine = serializers.UUIDField()
    counted_quantity = serializers.IntegerField(min_value=0)
    explanation = serializers.CharField(required=False, allow_blank=True, default="")


class SubmitStockCountSerializer(serializers.Serializer):
    lines = SubmitCountLineSerializer(many=True, min_length=1)