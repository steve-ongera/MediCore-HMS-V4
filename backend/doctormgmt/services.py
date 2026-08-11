from decimal import Decimal


def compute_commission_for_consultation(consultation, doctor_profile):
    """Called when a consultation completes — computes and records commission owed, if the doctor has a commission rate set."""
    if doctor_profile.commission_rate_percent <= 0:
        return None

    fee = doctor_profile.consultation_fee_override
    if fee is None:
        fee = getattr(consultation.visit.department, "consultation_fee", Decimal("0"))

    amount = (fee * doctor_profile.commission_rate_percent / Decimal("100")).quantize(Decimal("0.01"))
    if amount <= 0:
        return None

    from .models import DoctorCommission
    return DoctorCommission.objects.create(
        doctor=doctor_profile, consultation=consultation,
        amount_earned=amount,
        period_month=consultation.started_at.month, period_year=consultation.started_at.year,
    )