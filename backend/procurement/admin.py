from django.contrib import admin

from .models import (
    PurchaseRequisition, RequisitionItem, PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem, SupplierInvoice, SupplierPayment,
)


class RequisitionItemInline(admin.TabularInline):
    model = RequisitionItem
    extra = 0


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0


class GoodsReceiptItemInline(admin.TabularInline):
    model = GoodsReceiptItem
    extra = 0


@admin.register(PurchaseRequisition)
class PurchaseRequisitionAdmin(admin.ModelAdmin):
    list_display = ["requisition_number", "department", "status", "requested_by", "created_at"]
    list_filter = ["status"]
    search_fields = ["requisition_number"]
    inlines = [RequisitionItemInline]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["po_number", "supplier", "status", "order_date"]
    list_filter = ["status"]
    search_fields = ["po_number", "supplier__name"]
    inlines = [PurchaseOrderItemInline]


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ["grn_number", "purchase_order", "received_by", "received_at"]
    search_fields = ["grn_number"]
    inlines = [GoodsReceiptItemInline]


@admin.register(SupplierInvoice)
class SupplierInvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "supplier", "amount", "amount_paid", "status"]
    list_filter = ["status"]
    search_fields = ["invoice_number", "supplier_invoice_ref"]


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = ["payment_number", "supplier_invoice", "amount", "method", "paid_at"]