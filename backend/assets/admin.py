from django.contrib import admin

from .models import AssetCategory, Asset, AssetMaintenance, AssetTransfer, AssetDisposal


class AssetMaintenanceInline(admin.TabularInline):
    model = AssetMaintenance
    extra = 0


class AssetTransferInline(admin.TabularInline):
    model = AssetTransfer
    extra = 0


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "default_useful_life_years", "is_active"]
    search_fields = ["name"]


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ["asset_tag", "name", "category", "department", "status", "condition", "purchase_cost"]
    list_filter = ["status", "condition", "category"]
    search_fields = ["asset_tag", "name", "serial_number"]
    inlines = [AssetMaintenanceInline, AssetTransferInline]


@admin.register(AssetMaintenance)
class AssetMaintenanceAdmin(admin.ModelAdmin):
    list_display = ["asset", "maintenance_type", "status", "scheduled_date", "cost"]
    list_filter = ["status", "maintenance_type"]


@admin.register(AssetTransfer)
class AssetTransferAdmin(admin.ModelAdmin):
    list_display = ["asset", "from_department", "to_department", "transferred_at"]


@admin.register(AssetDisposal)
class AssetDisposalAdmin(admin.ModelAdmin):
    list_display = ["asset", "disposal_date", "disposal_method", "disposal_value"]