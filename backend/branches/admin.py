# branches/admin.py
from django.contrib import admin
from .models import Branch, BranchStaffAssignment

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "level", "is_headquarters", "is_active"]

admin.site.register(BranchStaffAssignment)