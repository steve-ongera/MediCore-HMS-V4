from rest_framework import serializers
from .models import DoctorProfile, DoctorSchedule, DoctorHoliday, DoctorCommission


class DoctorScheduleSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = DoctorSchedule
        fields = ["id", "doctor", "day_of_week", "start_time", "end_time", "department", "department_name", "max_patients", "is_active"]
        read_only_fields = ["id", "doctor"]


class DoctorHolidaySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = DoctorHoliday
        fields = ["id", "doctor", "doctor_name", "start_date", "end_date", "reason", "status", "approved_by", "approved_by_name", "requested_at"]
        read_only_fields = ["id", "status", "approved_by", "requested_at"]


class DoctorCommissionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.get_full_name", read_only=True)
    patient_name = serializers.CharField(source="consultation.visit.patient.full_name", read_only=True)

    class Meta:
        model = DoctorCommission
        fields = ["id", "doctor", "doctor_name", "consultation", "patient_name", "invoice", "amount_earned", "status", "period_month", "period_year", "paid_at", "created_at_display"]
        read_only_fields = fields


class DoctorProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    department_name = serializers.CharField(source="user.department.name", read_only=True)
    is_active_staff = serializers.BooleanField(source="user.is_active_staff", read_only=True)

    schedules = DoctorScheduleSerializer(many=True, read_only=True)
    holidays = DoctorHolidaySerializer(many=True, read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id", "user", "full_name", "username", "email", "phone", "department_name", "is_active_staff",
            "specialty", "qualifications", "license_number", "years_of_experience", "bio",
            "consultation_fee_override", "commission_rate_percent", "is_available_for_booking",
            "schedules", "holidays",
        ]
        read_only_fields = ["id"]


class DoctorProfileListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    department_name = serializers.CharField(source="user.department.name", read_only=True)
    is_active_staff = serializers.BooleanField(source="user.is_active_staff", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = ["id", "user", "full_name", "specialty", "department_name", "is_active_staff", "is_available_for_booking"]


class CreateDoctorProfileSerializer(serializers.Serializer):
    user = serializers.UUIDField()
    specialty = serializers.CharField(required=False, allow_blank=True, default="")
    qualifications = serializers.CharField(required=False, allow_blank=True, default="")
    license_number = serializers.CharField(required=False, allow_blank=True, default="")
    years_of_experience = serializers.IntegerField(required=False, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True, default="")
    consultation_fee_override = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    commission_rate_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)