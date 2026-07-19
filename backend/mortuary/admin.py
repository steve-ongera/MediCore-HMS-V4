from django.contrib import admin

from .models import (
    MortuaryUnit, MortuaryAdmission, MortuaryServiceCatalog, MortuaryServiceRecord,
    MortuaryCharge, BodyRelease,
)


class MortuaryServiceRecordInline(admin.TabularInline):
    model = MortuaryServiceRecord
    extra = 0


class MortuaryChargeInline(admin.TabularInline):
    model = MortuaryCharge
    extra = 0


@admin.register(MortuaryUnit)
class MortuaryUnitAdmin(admin.ModelAdmin):
    list_display = ["compartment_number", "daily_storage_rate", "status", "is_active"]


@admin.register(MortuaryAdmission)
class MortuaryAdmissionAdmin(admin.ModelAdmin):
    list_display = ["case_number", "deceased_display_name", "compartment", "status", "source", "admitted_at"]
    list_filter = ["status", "source"]
    search_fields = ["case_number", "patient__full_name", "deceased_name_freetext"]
    inlines = [MortuaryServiceRecordInline, MortuaryChargeInline]


@admin.register(MortuaryServiceCatalog)
class MortuaryServiceCatalogAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "price", "is_active"]


admin.site.register(BodyRelease)