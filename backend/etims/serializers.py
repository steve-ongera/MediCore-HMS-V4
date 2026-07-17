from rest_framework import serializers

from .models import FiscalizationConfig, FiscalizedReceipt, FiscalizedReceiptItem


class FiscalizationConfigSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = FiscalizationConfig
        fields = ["id", "kra_pin", "branch_id", "cu_serial", "default_vat_category", "is_active"]


class FiscalizedReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalizedReceiptItem
        fields = ["id", "description", "quantity", "unit_price", "vat_category", "line_total"]


class FiscalizedReceiptSerializer(serializers.ModelSerializer):
    source_description = serializers.CharField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    triggered_by_name = serializers.CharField(source="triggered_by.get_full_name", read_only=True)
    items = FiscalizedReceiptItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = FiscalizedReceipt
        fields = [
            "id", "payment", "otc_sale", "source_description", "patient_name", "total_amount",
            "status", "kra_invoice_number", "cu_invoice_number", "qr_code_url", "cu_signature",
            "fiscalized_at", "failure_reason", "retry_count", "triggered_by", "triggered_by_name",
            "items", "created_at",
        ]
        read_only_fields = [
            "id", "payment", "otc_sale", "status", "kra_invoice_number", "cu_invoice_number",
            "qr_code_url", "cu_signature", "fiscalized_at", "failure_reason", "retry_count", "triggered_by",
        ]

    def get_patient_name(self, obj):
        if obj.payment:
            return obj.payment.invoice.patient.full_name
        if obj.otc_sale:
            return obj.otc_sale.customer_name or "Walk-in Customer"
        return None