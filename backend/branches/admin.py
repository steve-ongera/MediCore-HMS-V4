# branches/admin.py
from django.contrib import admin
from .models import Branch, BranchStaffAssignment

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "level", "county", "is_headquarters", "is_active")
    list_filter = ("level", "is_active", "is_headquarters")
    search_fields = ("name", "code", "county")
    
    
admin.site.register(BranchStaffAssignment)