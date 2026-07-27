# stockcontrol/admin.py
from django.contrib import admin
from .models import StoreLocation, StoreStock, StockTransferRequest, StockTransferItem, StockCount, StockCountLine

class TransferItemInline(admin.TabularInline):
    model = StockTransferItem
    extra = 0

class CountLineInline(admin.TabularInline):
    model = StockCountLine
    extra = 0

@admin.register(StoreLocation)
class StoreLocationAdmin(admin.ModelAdmin):
    list_display = ["name", "location_type", "custodian", "is_active"]

@admin.register(StockTransferRequest)
class StockTransferRequestAdmin(admin.ModelAdmin):
    list_display = ["transfer_number", "from_location", "to_location", "status"]
    inlines = [TransferItemInline]

@admin.register(StockCount)
class StockCountAdmin(admin.ModelAdmin):
    list_display = ["count_number", "location", "status"]
    inlines = [CountLineInline]

admin.site.register(StoreStock)