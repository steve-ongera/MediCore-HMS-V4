# branches/serializers.py
from rest_framework import serializers
from .models import Branch, BranchStaffAssignment


class BranchSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ["id", "name", "code", "level", "address", "county", "phone", "email", "kra_pin", "sha_facility_code", "is_headquarters", "is_active", "staff_count"]

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active_staff=True).count()


class BranchStaffAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    granted_by_name = serializers.CharField(source="granted_by.get_full_name", read_only=True)

    class Meta:
        model = BranchStaffAssignment
        fields = ["id", "user", "user_name", "branch", "branch_name", "granted_by", "granted_by_name", "granted_at", "expires_at"]
        read_only_fields = ["id", "granted_by", "granted_at"]