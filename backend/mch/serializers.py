from rest_framework import serializers

from .models import (
    AntenatalProfile, ANCVisit, DeliveryRecord, Child, PostnatalVisit,
    VaccineCatalog, ChildImmunization, GrowthMonitoring,DeliveryCharge,
)


class ANCVisitSerializer(serializers.ModelSerializer):
    attended_by_name = serializers.CharField(source="attended_by.get_full_name", read_only=True)

    class Meta:
        model = ANCVisit
        fields = [
            "id", "profile", "visit_number", "gestational_age_weeks", "weight_kg",
            "bp_systolic", "bp_diastolic", "fundal_height_cm", "fetal_heartbeat_bpm",
            "fetal_presentation", "urinalysis", "hemoglobin_level", "notes",
            "next_appointment", "attended_by", "attended_by_name", "invoice", "visit_date",
        ]
        read_only_fields = ["id", "visit_number", "attended_by", "invoice", "visit_date"]


class DeliveryRecordSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="profile.mother.full_name", read_only=True)
    attended_by_name = serializers.CharField(source="attended_by.get_full_name", read_only=True)

    class Meta:
        model = DeliveryRecord
        fields = [
            "id", "delivery_number", "profile", "mother_name", "delivery_date",
            "mode_of_delivery", "outcome", "place_of_delivery", "attended_by",
            "attended_by_name", "complications", "blood_loss_ml", "admission", "invoice",
        ]
        read_only_fields = ["id", "delivery_number", "attended_by", "invoice"]


class ChildImmunizationSerializer(serializers.ModelSerializer):
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    vaccine_price = serializers.DecimalField(source="vaccine.price", max_digits=10, decimal_places=2, read_only=True)
    administered_by_name = serializers.CharField(source="administered_by.get_full_name", read_only=True)

    class Meta:
        model = ChildImmunization
        fields = [
            "id", "child", "vaccine", "vaccine_name", "vaccine_price", "status",
            "due_date", "given_date", "batch_number", "administered_by",
            "administered_by_name", "invoice",
        ]
        read_only_fields = ["id", "administered_by", "invoice"]


class GrowthMonitoringSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrowthMonitoring
        fields = [
            "id", "child", "weight_kg", "height_cm", "muac_cm",
            "nutrition_status", "notes", "recorded_by", "recorded_at",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_at"]


class ChildSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="mother.full_name", read_only=True)
    mother_hospital_number = serializers.CharField(source="mother.hospital_number", read_only=True)
    age_months = serializers.IntegerField(read_only=True)
    immunizations = ChildImmunizationSerializer(many=True, read_only=True)
    growth_records = GrowthMonitoringSerializer(many=True, read_only=True)

    class Meta:
        model = Child
        fields = [
            "id", "child_number", "mother", "mother_name", "mother_hospital_number",
            "delivery", "full_name", "sex", "date_of_birth", "birth_weight_kg",
            "birth_length_cm", "apgar_score_1min", "apgar_score_5min", "patient",
            "age_months", "registered_by", "immunizations", "growth_records",
        ]
        read_only_fields = ["id", "child_number", "registered_by"]


class ChildListSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="mother.full_name", read_only=True)
    age_months = serializers.IntegerField(read_only=True)

    class Meta:
        model = Child
        fields = ["id", "child_number", "mother_name", "full_name", "sex", "date_of_birth", "age_months"]


class PostnatalVisitSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="profile.mother.full_name", read_only=True)
    attended_by_name = serializers.CharField(source="attended_by.get_full_name", read_only=True)

    class Meta:
        model = PostnatalVisit
        fields = [
            "id", "profile", "mother_name", "child", "visit_day", "mother_bp_systolic",
            "mother_bp_diastolic", "mother_temp_c", "lochia_assessment",
            "breastfeeding_status", "child_weight_kg", "child_temp_c", "notes",
            "attended_by", "attended_by_name", "invoice", "visit_date",
        ]
        read_only_fields = ["id", "attended_by", "invoice", "visit_date"]


class AntenatalProfileSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="mother.full_name", read_only=True)
    hospital_number = serializers.CharField(source="mother.hospital_number", read_only=True)
    gestational_age_weeks = serializers.IntegerField(read_only=True)
    visits = ANCVisitSerializer(many=True, read_only=True)
    deliveries = DeliveryRecordSerializer(many=True, read_only=True)
    postnatal_visits = PostnatalVisitSerializer(many=True, read_only=True)

    class Meta:
        model = AntenatalProfile
        fields = [
            "id", "anc_number", "mother", "mother_name", "hospital_number",
            "gravida", "para", "lmp", "edd", "gestational_age_weeks", "blood_group",
            "height_cm", "booking_weight_kg", "hiv_status", "high_risk", "risk_factors",
            "status", "registered_by", "visit", "visits", "deliveries", "postnatal_visits",
        ]
        read_only_fields = ["id", "anc_number", "edd", "registered_by", "visit"]


class AntenatalProfileListSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source="mother.full_name", read_only=True)
    hospital_number = serializers.CharField(source="mother.hospital_number", read_only=True)
    gestational_age_weeks = serializers.IntegerField(read_only=True)

    class Meta:
        model = AntenatalProfile
        fields = [
            "id", "anc_number", "mother_name", "hospital_number", "gravida",
            "para", "edd", "gestational_age_weeks", "high_risk", "status",
        ]


class VaccineCatalogSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = VaccineCatalog
        fields = ["id", "code", "name", "recommended_age_weeks", "price", "is_active"]


class RegisterANCSerializer(serializers.Serializer):
    mother = serializers.UUIDField()
    gravida = serializers.IntegerField(min_value=0)
    para = serializers.IntegerField(min_value=0)
    lmp = serializers.DateField()
    blood_group = serializers.ChoiceField(
        choices=["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"], default="UNKNOWN"
    )
    height_cm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    booking_weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    hiv_status = serializers.ChoiceField(choices=["POSITIVE", "NEGATIVE", "UNKNOWN"], default="UNKNOWN")
    high_risk = serializers.BooleanField(default=False)
    risk_factors = serializers.CharField(required=False, allow_blank=True, default="")


class RecordDeliverySerializer(serializers.Serializer):
    delivery_date = serializers.DateTimeField()
    mode_of_delivery = serializers.ChoiceField(choices=["SVD", "ASSISTED", "CAESAREAN", "BREECH"])
    outcome = serializers.ChoiceField(choices=["LIVE_BIRTH", "STILLBIRTH"])
    place_of_delivery = serializers.CharField(required=False, default="Facility")
    complications = serializers.CharField(required=False, allow_blank=True, default="")
    blood_loss_ml = serializers.IntegerField(required=False, allow_null=True)
    admission = serializers.UUIDField(required=False, allow_null=True)
    child_full_name = serializers.CharField(required=False, allow_blank=True, default="")
    child_sex = serializers.ChoiceField(choices=["MALE", "FEMALE"], required=False)
    birth_weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    birth_length_cm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    apgar_score_1min = serializers.IntegerField(required=False, allow_null=True)
    apgar_score_5min = serializers.IntegerField(required=False, allow_null=True)
    
class AddChargeSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    
    
class DeliveryChargeSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source="added_by.get_full_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    amount = serializers.DecimalField(source="invoice.amount", max_digits=10, decimal_places=2, read_only=True)
    amount_paid = serializers.DecimalField(source="invoice.amount_paid", max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(source="invoice.balance", max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(source="invoice.status", read_only=True)

    class Meta:
        model = DeliveryCharge
        fields = [
            "id", "delivery", "invoice", "invoice_number", "description",
            "amount", "amount_paid", "balance", "status", "added_by", "added_by_name", "created_at",
        ]
        read_only_fields = ["id", "invoice", "added_by", "created_at"]