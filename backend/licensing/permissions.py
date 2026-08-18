#licensing/permissions.py
from rest_framework.permissions import BasePermission
from .models import get_active_license


class IsMediCoreOps(BasePermission):
    message = "Only MediCore's support team can modify license settings. Please contact MediCore to request a change."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class CanViewLicense(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        from api.models import Role
        return request.user.is_superuser or request.user.role == Role.SUPER_ADMIN


class WithinBedLimit(BasePermission):
    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
    message = "This facility's license does not permit adding more beds. Contact MediCore to upgrade your package."

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        license_obj = get_active_license()
        if not license_obj:
            return True
        if license_obj.is_expired:
            self.message = "This facility's license has expired. Contact MediCore to renew."
            return False

        current = license_obj.current_bed_count
        if current is None:
            # Bed model/field not yet confirmed — fail OPEN rather than
            # blocking every bed-creation request with an unverified number.
            # Remove this guard once current_bed_count is confirmed working.
            return True

        return current < license_obj.max_beds


class WithinUserLimit(BasePermission):
    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
    message = "This facility's license does not permit adding more staff accounts. Contact MediCore to upgrade your package."

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        license_obj = get_active_license()
        if not license_obj:
            return True
        if license_obj.is_expired:
            self.message = "This facility's license has expired. Contact MediCore to renew."
            return False
        return license_obj.current_user_count < license_obj.max_users
    
    

class WithinPatientLimit(BasePermission):
    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
    message = "This facility's license does not permit registering more patients. Contact MediCore to upgrade your package."

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        license_obj = get_active_license()
        if not license_obj:
            return True
        if license_obj.is_expired:
            self.message = "This facility's license has expired. Contact MediCore to renew."
            return False
        return license_obj.current_patient_count < license_obj.max_patients