#mch/models.py
import uuid
from datetime import timedelta

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

from api.models import BaseModel, User, Patient


class BloodGroup(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"
    UNKNOWN = "UNKNOWN", "Unknown"


class HIVStatus(models.TextChoices):
    POSITIVE = "POSITIVE", "Positive"
    NEGATIVE = "NEGATIVE", "Negative"
    UNKNOWN = "UNKNOWN", "Unknown"


class PregnancyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DELIVERED = "DELIVERED", "Delivered"
    MISCARRIAGE = "MISCARRIAGE", "Miscarriage"
    TERMINATED = "TERMINATED", "Terminated"


class AntenatalProfile(BaseModel):
    """One record per pregnancy for a mother (Patient)."""
    anc_number = models.CharField(max_length=30, unique=True, editable=False)
    mother = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="antenatal_profiles")
    gravida = models.PositiveSmallIntegerField(help_text="Total number of pregnancies")
    para = models.PositiveSmallIntegerField(help_text="Number of births past 28 weeks")
    lmp = models.DateField(verbose_name="Last Menstrual Period")
    edd = models.DateField(verbose_name="Estimated Date of Delivery", editable=False)
    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    booking_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hiv_status = models.CharField(max_length=20, choices=HIVStatus.choices, default=HIVStatus.UNKNOWN)
    high_risk = models.BooleanField(default=False)
    risk_factors = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PregnancyStatus.choices, default=PregnancyStatus.ACTIVE)
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="anc_profiles_registered")
    visit = models.ForeignKey("api.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="antenatal_profiles")

    class Meta:
        db_table = "antenatal_profiles"

    def save(self, *args, **kwargs):
        if not self.anc_number:
            from .utils import generate_anc_number
            self.anc_number = generate_anc_number()
        if self.lmp and not self.edd:
            self.edd = self.lmp + timedelta(days=280)
        super().save(*args, **kwargs)

    @property
    def gestational_age_weeks(self):
        if not self.lmp:
            return None
        return (timezone.now().date() - self.lmp).days // 7

    def __str__(self):
        return f"{self.anc_number} - {self.mother.full_name}"


class ANCVisit(BaseModel):
    profile = models.ForeignKey(AntenatalProfile, on_delete=models.CASCADE, related_name="visits")
    visit_number = models.PositiveSmallIntegerField(help_text="Sequential ANC visit number")
    gestational_age_weeks = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    fundal_height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fetal_heartbeat_bpm = models.PositiveSmallIntegerField(null=True, blank=True)
    fetal_presentation = models.CharField(max_length=50, blank=True)
    urinalysis = models.CharField(max_length=100, blank=True)
    hemoglobin_level = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True)
    next_appointment = models.DateField(null=True, blank=True)
    attended_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="anc_visits_attended")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="anc_visits")
    visit_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "anc_visits"
        ordering = ["visit_number"]

    def __str__(self):
        return f"ANC Visit #{self.visit_number} - {self.profile.mother.full_name}"



class DeliveryMode(models.TextChoices):
    SVD = "SVD", "Spontaneous Vaginal Delivery"
    ASSISTED = "ASSISTED", "Assisted Vaginal Delivery"
    CAESAREAN = "CAESAREAN", "Caesarean Section"
    BREECH = "BREECH", "Breech Delivery"


class DeliveryOutcome(models.TextChoices):
    LIVE_BIRTH = "LIVE_BIRTH", "Live Birth"
    STILLBIRTH = "STILLBIRTH", "Stillbirth"


class DeliveryRecord(BaseModel):
    delivery_number = models.CharField(max_length=30, unique=True, editable=False)
    profile = models.ForeignKey(AntenatalProfile, on_delete=models.CASCADE, related_name="deliveries")
    delivery_date = models.DateTimeField()
    mode_of_delivery = models.CharField(max_length=20, choices=DeliveryMode.choices, default=DeliveryMode.SVD)
    outcome = models.CharField(max_length=20, choices=DeliveryOutcome.choices, default=DeliveryOutcome.LIVE_BIRTH)
    place_of_delivery = models.CharField(max_length=150, default="Facility")
    attended_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="deliveries_attended")
    complications = models.TextField(blank=True)
    blood_loss_ml = models.PositiveIntegerField(null=True, blank=True)
    admission = models.ForeignKey(
        "inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="deliveries"
    )
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="deliveries")

    class Meta:
        db_table = "delivery_records"

    def save(self, *args, **kwargs):
        if not self.delivery_number:
            from .utils import generate_delivery_number
            self.delivery_number = generate_delivery_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.delivery_number} - {self.profile.mother.full_name}"

class DeliveryCharge(BaseModel):
    """
    Every invoice raised against a specific delivery — the base delivery fee
    plus any ad-hoc charges (blood transfusion, theatre time, consumables,
    etc.). DeliveryRecord.invoice stays as a convenience pointer to the base
    fee; this table is the full, queryable history.
    """
    delivery = models.ForeignKey(DeliveryRecord, on_delete=models.CASCADE, related_name="charges")
    invoice = models.ForeignKey("api.Invoice", on_delete=models.CASCADE, related_name="delivery_charges")
    description = models.CharField(max_length=255)
    added_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="delivery_charges_added")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "delivery_charges"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.description} - {self.delivery.delivery_number}"

class Sex(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"


class Child(BaseModel):
    child_number = models.CharField(max_length=30, unique=True, editable=False)
    mother = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="children")
    delivery = models.ForeignKey(DeliveryRecord, null=True, blank=True, on_delete=models.SET_NULL, related_name="children")
    full_name = models.CharField(max_length=150, blank=True, help_text="May be added after naming")
    sex = models.CharField(max_length=10, choices=Sex.choices)
    date_of_birth = models.DateField()
    birth_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    birth_length_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    apgar_score_1min = models.PositiveSmallIntegerField(null=True, blank=True)
    apgar_score_5min = models.PositiveSmallIntegerField(null=True, blank=True)
    patient = models.OneToOneField(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="child_profile")
    registered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="children_registered")

    class Meta:
        db_table = "mch_children"

    def save(self, *args, **kwargs):
        if not self.child_number:
            from .utils import generate_child_number
            self.child_number = generate_child_number()
        super().save(*args, **kwargs)

    @property
    def age_months(self):
        today = timezone.now().date()
        return (today.year - self.date_of_birth.year) * 12 + (today.month - self.date_of_birth.month)

    def __str__(self):
        return f"{self.child_number} - {self.full_name or ('Baby of ' + self.mother.full_name)}"


class PostnatalVisit(BaseModel):
    profile = models.ForeignKey(AntenatalProfile, on_delete=models.CASCADE, related_name="postnatal_visits")
    child = models.ForeignKey(Child, null=True, blank=True, on_delete=models.SET_NULL, related_name="postnatal_visits")
    visit_day = models.PositiveSmallIntegerField(help_text="Day post-delivery, e.g. 1, 3, 7, 42")
    mother_bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    mother_bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    mother_temp_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    lochia_assessment = models.CharField(max_length=100, blank=True)
    breastfeeding_status = models.CharField(max_length=100, blank=True)
    child_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    child_temp_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True)
    attended_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="pnc_visits_attended")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="pnc_visits")
    visit_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "postnatal_visits"

    def __str__(self):
        return f"PNC Day {self.visit_day} - {self.profile.mother.full_name}"


class VaccineCatalog(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    recommended_age_weeks = models.PositiveSmallIntegerField(help_text="Recommended age at administration, in weeks")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "vaccine_catalog"
        ordering = ["recommended_age_weeks"]

    def __str__(self):
        return self.name


class ImmunizationStatus(models.TextChoices):
    DUE = "DUE", "Due"
    GIVEN = "GIVEN", "Given"
    MISSED = "MISSED", "Missed"


class ChildImmunization(BaseModel):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="immunizations")
    vaccine = models.ForeignKey(VaccineCatalog, on_delete=models.PROTECT, related_name="administrations")
    status = models.CharField(max_length=20, choices=ImmunizationStatus.choices, default=ImmunizationStatus.DUE)
    due_date = models.DateField(null=True, blank=True)
    given_date = models.DateField(null=True, blank=True)
    batch_number = models.CharField(max_length=60, blank=True)
    administered_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="immunizations_administered")
    invoice = models.ForeignKey("api.Invoice", null=True, blank=True, on_delete=models.SET_NULL, related_name="child_immunizations")

    class Meta:
        db_table = "child_immunizations"
        unique_together = ("child", "vaccine")

    def __str__(self):
        return f"{self.vaccine.name} - {self.child.child_number}"


class NutritionStatus(models.TextChoices):
    NORMAL = "NORMAL", "Normal"
    MODERATE_MALNUTRITION = "MODERATE_MALNUTRITION", "Moderate Malnutrition"
    SEVERE_MALNUTRITION = "SEVERE_MALNUTRITION", "Severe Malnutrition"
    OVERWEIGHT = "OVERWEIGHT", "Overweight"


class GrowthMonitoring(BaseModel):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="growth_records")
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    muac_cm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="MUAC (cm)")
    nutrition_status = models.CharField(max_length=30, choices=NutritionStatus.choices, default=NutritionStatus.NORMAL)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="growth_records_entered")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "growth_monitoring"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"Growth - {self.child.child_number} ({self.recorded_at.date()})"