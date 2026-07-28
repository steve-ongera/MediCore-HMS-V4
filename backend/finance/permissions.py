from rest_framework.permissions import BasePermission

from api.models import Role
from finance.models import CashierShift, ShiftStatus


class RequiresOpenTill(BasePermission):
    """
    Blocks write actions (POST/PATCH/PUT) for CASHIER-role users unless they
    have a currently OPEN CashierShift. Read (GET) is always allowed so the
    cashier can still see invoices/history without a till open. Non-cashier
    roles (Accountant, Super Admin) are never blocked by this check — the
    till discipline is specifically a cashier-role control.
    """
    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role != Role.CASHIER:
            return True
        return CashierShift.objects.filter(cashier=request.user, status=ShiftStatus.OPEN).exists()

    def message(self):
        return "You must open your cash till before processing any billing transaction."