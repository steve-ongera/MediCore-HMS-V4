from rest_framework.permissions import BasePermission
from .models import get_active_license


class WithinBedLimit(BasePermission):
    """Blocks creating a new Bed/ICUBed once the licensed max_beds count is reached."""
    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
    message = "This facility's license does not permit adding more beds. Contact MediCore to upgrade your package."

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        license_obj = get_active_license()
        if not license_obj:
            return True  # no license configured — unrestricted (e.g. during initial setup before licensing is provisioned)
        if license_obj.is_expired:
            self.message = "This facility's license has expired. Contact MediCore to renew."
            return False
        return license_obj.current_bed_count < license_obj.max_beds


class WithinUserLimit(BasePermission):
    """Blocks creating a new User account once the licensed max_users count is reached."""
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