# leakage/admin.py
from django.contrib import admin
from .models import RevenueLeakageRecord, LeakageScanLog

@admin.register(RevenueLeakageRecord)
class RevenueLeakageRecordAdmin(admin.ModelAdmin):
    list_display = ["source_type", "patient_name", "expected_amount", "status", "event_date"]
    list_filter = ["status", "source_type"]
    search_fields = ["patient_name", "hospital_number"]

admin.site.register(LeakageScanLog)