# executive/admin.py
from django.contrib import admin
from .models import Refund, BillCancellation

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["refund_number", "amount", "status", "requested_at"]

@admin.register(BillCancellation)
class BillCancellationAdmin(admin.ModelAdmin):
    list_display = ["invoice", "cancelled_by", "cancelled_at"]