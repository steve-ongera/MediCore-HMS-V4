from django.contrib import admin

from .models import FiscalizationConfig, FiscalizedReceipt, FiscalizedReceiptItem


class FiscalizedReceiptItemInline(admin.TabularInline):
    model = FiscalizedReceiptItem
    extra = 0


@admin.register(FiscalizationConfig)
class FiscalizationConfigAdmin(admin.ModelAdmin):
    list_display = ["kra_pin", "branch_id", "cu_serial", "default_vat_category", "is_active"]


@admin.register(FiscalizedReceipt)
class FiscalizedReceiptAdmin(admin.ModelAdmin):
    list_display = ["source_description", "status", "kra_invoice_number", "total_amount", "fiscalized_at"]
    list_filter = ["status"]
    search_fields = ["kra_invoice_number", "payment__receipt_number", "otc_sale__sale_number"]
    inlines = [FiscalizedReceiptItemInline]