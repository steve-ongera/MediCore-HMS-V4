from rest_framework.permissions import BasePermission
from api.models import Role


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPER_ADMIN)


class HasRole(BasePermission):
    """
    Generic role-gate. Set `allowed_roles` on the view, e.g.:
        allowed_roles = [Role.RECEPTIONIST, Role.SUPER_ADMIN]
    Super Admin is always allowed through, regardless of allowed_roles.
    If a view sets NO allowed_roles, access is denied by default (fail-closed) —
    this is the opposite of the old behavior, which silently allowed any
    authenticated user through when a view forgot to set allowed_roles.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == Role.SUPER_ADMIN:
            return True
        allowed_roles = getattr(view, "allowed_roles", None)
        if not allowed_roles:
            return False  # fail-closed: an unconfigured view denies everyone but Super Admin
        return request.user.role in allowed_roles


def role_permission(*roles):
    """
    Factory for one-off role gates without writing a new class every time.
    Usage in a view:
        permission_classes = [role_permission(Role.NURSE, Role.DOCTOR)]
    """
    class _RolePermission(HasRole):
        def has_permission(self, request, view):
            view.allowed_roles = list(roles)
            return super().has_permission(request, view)
    return _RolePermission


# ---------------------------------------------------------------------------
# Single-role gates (existing modules)
# ---------------------------------------------------------------------------
class IsReceptionist(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.RECEPTIONIST]
        return super().has_permission(request, view)


class IsCashierOrAccountant(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.CASHIER, Role.ACCOUNTANT]
        return super().has_permission(request, view)


class IsNurse(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.NURSE]
        return super().has_permission(request, view)


class IsDoctor(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.DOCTOR]
        return super().has_permission(request, view)


class IsNurseOrDoctor(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.NURSE, Role.DOCTOR]
        return super().has_permission(request, view)


class IsLabTechnologist(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.LAB_TECHNOLOGIST]
        return super().has_permission(request, view)


class IsRadiologist(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.RADIOLOGIST]
        return super().has_permission(request, view)


class IsPharmacist(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.PHARMACIST]
        return super().has_permission(request, view)


class IsAccountant(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.ACCOUNTANT]
        return super().has_permission(request, view)


# ---------------------------------------------------------------------------
# New-module role gates
# ---------------------------------------------------------------------------
class IsMortuaryAttendant(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.MORTUARY_ATTENDANT]
        return super().has_permission(request, view)


class IsMortuaryStaff(HasRole):
    """Mortuary is jointly staffed by dedicated attendants and clinical staff who bring bodies in."""
    def has_permission(self, request, view):
        view.allowed_roles = [Role.MORTUARY_ATTENDANT, Role.NURSE, Role.DOCTOR, Role.RECEPTIONIST]
        return super().has_permission(request, view)


class IsHROfficer(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.HR_OFFICER]
        return super().has_permission(request, view)


class IsProcurementOfficer(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.PROCUREMENT_OFFICER]
        return super().has_permission(request, view)


class IsProcurementOrAccountant(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.PROCUREMENT_OFFICER, Role.ACCOUNTANT]
        return super().has_permission(request, view)


class IsAmbulanceDispatcher(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.AMBULANCE_DISPATCHER]
        return super().has_permission(request, view)


class IsAmbulanceStaff(HasRole):
    """Dispatch is a dedicated role, but front desk / clinical staff also request rides."""
    def has_permission(self, request, view):
        view.allowed_roles = [Role.AMBULANCE_DISPATCHER, Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR]
        return super().has_permission(request, view)


class IsClinicalStaff(HasRole):
    """Broad clinical gate used by modules that any nurse/doctor can touch — Theatre, ICU, Dialysis, Dental, Eye Clinic, Blood Bank, Emergency, MCH, Inpatient."""
    def has_permission(self, request, view):
        view.allowed_roles = [Role.NURSE, Role.DOCTOR]
        return super().has_permission(request, view)


class IsFrontOfficeStaff(HasRole):
    """Receptionist plus anyone who also needs registration access (nurse/doctor covering front desk gaps in a small facility)."""
    def has_permission(self, request, view):
        view.allowed_roles = [Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR]
        return super().has_permission(request, view)


# ---------------------------------------------------------------------------
# Catalog / lookup tables — read-only for everyone, write for Super Admin only
# ---------------------------------------------------------------------------
class ReadOnlyOrSuperAdmin(BasePermission):
    """Allows safe (GET/HEAD/OPTIONS) methods to anyone authenticated,
    but restricts write methods to Super Admin. Useful for catalog/lookup
    tables like ICD10Code, LabTestCatalog, Department, etc."""

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in self.SAFE_METHODS:
            return True
        return request.user.role == Role.SUPER_ADMIN