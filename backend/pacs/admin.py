# pacs/admin.py
from django.contrib import admin
from .models import Study, Series, DicomImage, RadiologyReport

class SeriesInline(admin.TabularInline):
    model = Series
    extra = 0

@admin.register(Study)
class StudyAdmin(admin.ModelAdmin):
    list_display = ["accession_number", "patient", "modality", "status", "source", "scheduled_at"]
    list_filter = ["status", "modality", "source"]
    search_fields = ["accession_number", "patient__full_name"]
    inlines = [SeriesInline]

admin.site.register(RadiologyReport)