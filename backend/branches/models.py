from django.db import models
from api.models import BaseModel, User


class FacilityLevel(models.TextChoices):
    LEVEL_2 = "LEVEL_2", "Level 2 (Dispensary)"
    LEVEL_3 = "LEVEL_3", "Level 3 (Health Centre)"
    LEVEL_4 = "LEVEL_4", "Level 4 (Sub-County Hospital)"
    LEVEL_5 = "LEVEL_5", "Level 5 (County/Referral Hospital)"
    CLINIC = "CLINIC", "Clinic"


class Branch(BaseModel):
    """
    One row per physical facility in the group. Everything branch-scoped
    in the system points here. is_headquarters marks the branch that acts
    as the group's administrative anchor (not necessarily the largest).
    """
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True, help_text="Short code used in patient/invoice numbering, e.g. 'NRB', 'MSA'.")
    level = models.CharField(max_length=20, choices=FacilityLevel.choices, default=FacilityLevel.LEVEL_4)

    address = models.CharField(max_length=255, blank=True)
    county = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    kra_pin = models.CharField(max_length=20, blank=True, help_text="Branch's own KRA PIN, if eTIMS is fiscalized per-branch rather than group-wide.")
    sha_facility_code = models.CharField(max_length=50, blank=True)

    is_headquarters = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "branches"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.level})"


class BranchStaffAssignment(BaseModel):
    """
    Explicit grant of access to a branch beyond a user's primary branch —
    for float staff, locum doctors, or a regional pharmacist who covers
    two branches. A user's PRIMARY branch access comes from api.User.branch
    directly; this table is only for ADDITIONAL branches.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="additional_branch_assignments")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="staff_assignments")
    granted_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="branch_assignments_granted")
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Optional — for temporary cover, e.g. a locum's contract end date.")

    class Meta:
        db_table = "branch_staff_assignments"
        unique_together = ("user", "branch")

    def __str__(self):
        return f"{self.user.username} @ {self.branch.name}"