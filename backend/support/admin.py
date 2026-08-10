# support/admin.py
from django.contrib import admin
from .models import ContactInquiry

@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "topic", "status", "submitted_at"]
    list_filter = ["topic", "status"]