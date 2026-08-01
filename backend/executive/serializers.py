from rest_framework import serializers
from .models import Refund, BillCancellation


class RefundSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="payment.invoice.patient.full_name", read_only=True)
    invoice_number = serializers.CharField(source="payment.invoice.invoice_number", read_only=True)
    receipt_number = serializers.CharField(source="payment.receipt_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = Refund
        fields = [
            "id", "refund_number", "payment", "invoice_number", "receipt_number", "patient_name",
            "amount", "reason", "status", "requested_by", "requested_by_name",
            "approved_by", "approved_by_name", "approved_at", "rejection_reason",
            "requested_at", "processed_at",
        ]
        read_only_fields = ["id", "refund_number", "requested_by", "status", "approved_by", "approved_at", "requested_at", "processed_at"]


class RequestRefundSerializer(serializers.Serializer):
    payment = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01)
    reason = serializers.CharField()


class RejectRefundSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField()


class BillCancellationSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    patient_name = serializers.CharField(source="invoice.patient.full_name", read_only=True)
    cancelled_by_name = serializers.CharField(source="cancelled_by.get_full_name", read_only=True)

    class Meta:
        model = BillCancellation
        fields = ["id", "invoice", "invoice_number", "patient_name", "reason", "cancelled_by", "cancelled_by_name", "cancelled_at"]
        read_only_fields = ["id", "cancelled_by", "cancelled_at"]


class CancelBillSerializer(serializers.Serializer):
    invoice = serializers.UUIDField()
    reason = serializers.CharField()