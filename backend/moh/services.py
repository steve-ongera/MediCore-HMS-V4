from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, Q


def _date_range(request):
    date_from = request.query_params.get("date_from") or str(date.today().replace(day=1))
    date_to = request.query_params.get("date_to") or str(date.today())
    return date_from, date_to


def opd_report(date_from, date_to):
    from api.models import Visit, ConsultationType

    visits = Visit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to)
    total_visits = visits.count()
    unique_patients = visits.values("patient").distinct().count()

    # New vs returning — a patient is "new" on their first-ever visit date within this system.
    from api.models import Patient
    new_count = 0
    returning_count = 0
    for patient_id in visits.values_list("patient", flat=True).distinct():
        first_visit = Visit.objects.filter(patient_id=patient_id).order_by("visit_date").first()
        if first_visit and date_from <= str(first_visit.visit_date.date()) <= date_to:
            new_count += 1
        else:
            returning_count += 1

    by_department = list(visits.values("department__name").annotate(count=Count("id")).order_by("-count"))

    try:
        male_count = visits.filter(patient__gender__iexact="MALE").values("patient").distinct().count()
        female_count = visits.filter(patient__gender__iexact="FEMALE").values("patient").distinct().count()
    except Exception:
        male_count = female_count = None

    by_consultation_type = list(visits.values("consultation_type").annotate(count=Count("id")).order_by("-count"))

    return {
        "total_visits": total_visits,
        "unique_patients": unique_patients,
        "new_patients": new_count,
        "returning_patients": returning_count,
        "male_patients": male_count,
        "female_patients": female_count,
        "by_department": [{"name": r["department__name"] or "Unknown", "value": r["count"]} for r in by_department],
        "by_consultation_type": [{"name": r["consultation_type"], "value": r["count"]} for r in by_consultation_type],
    }


def inpatient_capacity_report(date_from, date_to):
    from inpatient.models import Admission, AdmissionStatus, Bed, Ward

    admissions_in_period = Admission.objects.filter(admitted_at__date__gte=date_from, admitted_at__date__lte=date_to)
    discharges_in_period = Admission.objects.filter(
        discharged_at__isnull=False, discharged_at__date__gte=date_from, discharged_at__date__lte=date_to
    )

    total_admissions = admissions_in_period.count()
    total_discharges = discharges_in_period.count()

    los_values = [
        (a.discharged_at - a.admitted_at).days
        for a in discharges_in_period if a.discharged_at and a.admitted_at
    ]
    avg_los = round(sum(los_values) / len(los_values), 1) if los_values else 0

    try:
        total_beds = Bed.objects.count()
    except Exception:
        total_beds = None

    try:
        currently_occupied = Bed.objects.filter(status__iexact="OCCUPIED").count()
    except Exception:
        currently_occupied = None

    bed_occupancy_rate = (
        round((currently_occupied / total_beds) * 100, 1)
        if total_beds and currently_occupied is not None and total_beds > 0 else None
    )

    by_ward = []
    try:
        for ward in Ward.objects.all():
            ward_beds = Bed.objects.filter(ward=ward).count()
            ward_occupied = Bed.objects.filter(ward=ward, status__iexact="OCCUPIED").count()
            by_ward.append({"name": ward.name, "total": ward_beds, "occupied": ward_occupied})
    except Exception:
        pass

    admission_trend = []
    d = date.fromisoformat(str(date_from))
    end = date.fromisoformat(str(date_to))
    while d <= end:
        admission_trend.append({"name": d.isoformat(), "value": Admission.objects.filter(admitted_at__date=d).count()})
        d += timedelta(days=1)

    try:
        from icu.models import ICUBed, ICUAdmission
        icu_total_beds = ICUBed.objects.count()
        icu_occupied = ICUBed.objects.filter(status__iexact="OCCUPIED").count()
    except Exception:
        icu_total_beds = icu_occupied = None

    return {
        "total_admissions": total_admissions,
        "total_discharges": total_discharges,
        "average_length_of_stay_days": avg_los,
        "total_beds": total_beds,
        "currently_occupied_beds": currently_occupied,
        "bed_occupancy_rate_percent": bed_occupancy_rate,
        "icu_total_beds": icu_total_beds,
        "icu_occupied_beds": icu_occupied,
        "by_ward": by_ward,
        "admission_trend": admission_trend,
    }


def mch_report(date_from, date_to):
    from mch.models import AntenatalProfile, ANCVisit, DeliveryRecord, DeliveryMode, PostnatalVisit, ChildImmunization

    anc_registrations = AntenatalProfile.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to).count()
    anc_visits = ANCVisit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to).count()

    deliveries = DeliveryRecord.objects.filter(delivery_date__date__gte=date_from, delivery_date__date__lte=date_to) \
        if hasattr(DeliveryRecord, "delivery_date") else DeliveryRecord.objects.none()

    total_deliveries = deliveries.count()
    by_mode = list(deliveries.values("mode").annotate(count=Count("id"))) if total_deliveries else []
    c_sections = deliveries.filter(mode__icontains="CAESAR").count() if total_deliveries else 0

    live_births = deliveries.filter(outcome__icontains="LIVE").count() if hasattr(DeliveryRecord, "outcome") else None
    stillbirths = deliveries.filter(outcome__icontains="STILL").count() if hasattr(DeliveryRecord, "outcome") else None

    pnc_visits = PostnatalVisit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to).count()

    immunizations_given = ChildImmunization.objects.filter(
        status__iexact="GIVEN", given_date__gte=date_from, given_date__lte=date_to
    ).count() if hasattr(ChildImmunization, "given_date") else None

    try:
        from medrecords.models import DeathRegister
        maternal_deaths = DeathRegister.objects.filter(
            date_of_death__date__gte=date_from, date_of_death__date__lte=date_to,
            cause_of_death__icontains="maternal",
        ).count()
    except Exception:
        maternal_deaths = None

    return {
        "anc_registrations": anc_registrations,
        "anc_visits": anc_visits,
        "total_deliveries": total_deliveries,
        "c_sections": c_sections,
        "live_births": live_births,
        "stillbirths": stillbirths,
        "maternal_deaths": maternal_deaths,
        "pnc_visits": pnc_visits,
        "immunizations_given": immunizations_given,
        "by_delivery_mode": [{"name": r["mode"], "value": r["count"]} for r in by_mode],
    }


def mortality_report(date_from, date_to):
    try:
        from medrecords.models import DeathRegister
    except Exception:
        return {"total_deaths": None, "by_department": [], "by_cause": [], "detail": []}

    deaths = DeathRegister.objects.filter(date_of_death__date__gte=date_from, date_of_death__date__lte=date_to)
    total_deaths = deaths.count()

    by_cause = list(deaths.values("cause_of_death").annotate(count=Count("id")).order_by("-count")[:15])

    try:
        male_deaths = deaths.filter(patient__gender__iexact="MALE").count()
        female_deaths = deaths.filter(patient__gender__iexact="FEMALE").count()
    except Exception:
        male_deaths = female_deaths = None

    trend = []
    d = date.fromisoformat(str(date_from))
    end = date.fromisoformat(str(date_to))
    while d <= end:
        trend.append({"name": d.isoformat(), "value": deaths.filter(date_of_death__date=d).count()})
        d += timedelta(days=1)

    return {
        "total_deaths": total_deaths,
        "male_deaths": male_deaths,
        "female_deaths": female_deaths,
        "by_cause": [{"name": (r["cause_of_death"] or "Unspecified")[:60], "value": r["count"]} for r in by_cause],
        "trend": trend,
    }


def disease_surveillance_report(date_from, date_to):
    from api.models import ConsultationDiagnosis

    diagnoses = ConsultationDiagnosis.objects.filter(
        consultation__started_at__date__gte=date_from, consultation__started_at__date__lte=date_to
    ).exclude(icd10_code__isnull=True)

    top_diagnoses = list(
        diagnoses.values("icd10_code__code", "icd10_code__description")
        .annotate(count=Count("id")).order_by("-count")[:20]
    )

    # Priority disease keyword matching against description — a lightweight
    # proxy for program-specific reporting (malaria, TB, HIV, diarrhoeal,
    # respiratory) since a dedicated program-flag field doesn't exist yet.
    priority_keywords = {
        "Malaria": "malaria", "Tuberculosis (TB)": "tuberculosis",
        "HIV": "hiv", "Diarrhoeal Disease": "diarrh",
        "Respiratory Infection": "respiratory", "Pneumonia": "pneumonia",
    }
    priority_counts = []
    for label, keyword in priority_keywords.items():
        count = diagnoses.filter(icd10_code__description__icontains=keyword).count()
        priority_counts.append({"name": label, "value": count})

    return {
        "total_diagnoses_coded": diagnoses.count(),
        "top_diagnoses": [
            {"name": f"{d['icd10_code__code']} - {d['icd10_code__description']}", "value": d["count"]}
            for d in top_diagnoses
        ],
        "priority_diseases": priority_counts,
    }


def lab_radiology_report(date_from, date_to):
    from api.models import LabOrder, LabOrderStatus, RadiologyOrder, RadiologyOrderStatus

    lab_orders = LabOrder.objects.filter(ordered_at__date__gte=date_from, ordered_at__date__lte=date_to)
    lab_completed = lab_orders.filter(status=LabOrderStatus.COMPLETED)

    lab_turnaround = []
    for order in lab_completed.select_related("result"):
        if hasattr(order, "result") and order.result and order.result.completed_at:
            hours = (order.result.completed_at - order.ordered_at).total_seconds() / 3600
            lab_turnaround.append(hours)
    avg_lab_turnaround = round(sum(lab_turnaround) / len(lab_turnaround), 1) if lab_turnaround else None

    by_test = list(lab_orders.values("test__name").annotate(count=Count("id")).order_by("-count")[:15])

    rad_orders = RadiologyOrder.objects.filter(ordered_at__date__gte=date_from, ordered_at__date__lte=date_to)
    rad_completed = rad_orders.filter(status=RadiologyOrderStatus.REPORTED)
    by_modality = list(rad_orders.values("test__name").annotate(count=Count("id")).order_by("-count")[:15])

    return {
        "total_lab_orders": lab_orders.count(),
        "lab_orders_completed": lab_completed.count(),
        "average_lab_turnaround_hours": avg_lab_turnaround,
        "lab_by_test": [{"name": r["test__name"], "value": r["count"]} for r in by_test],
        "total_radiology_orders": rad_orders.count(),
        "radiology_reported": rad_completed.count(),
        "radiology_by_modality": [{"name": r["test__name"], "value": r["count"]} for r in by_modality],
    }


def pharmacy_commodities_report(date_from, date_to):
    from api.models import PharmacyDispense, OTCSale, Medicine, MedicineBatch, StockTransaction, StockTransactionType

    dispenses = PharmacyDispense.objects.filter(
        status="COMPLETED", completed_at__date__gte=date_from, completed_at__date__lte=date_to
    ) if hasattr(PharmacyDispense, "completed_at") else PharmacyDispense.objects.none()

    top_dispensed = list(
        dispenses.values("prescription__medicine__name")
        .annotate(qty=Sum("quantity_dispensed")).order_by("-qty")[:15]
    )

    low_stock = [{"name": m.name, "value": getattr(m, "current_stock", None)} for m in Medicine.objects.all() if getattr(m, "is_low_stock", False)]

    stock_outs = 0
    for m in Medicine.objects.all():
        total = MedicineBatch.objects.filter(medicine=m).aggregate(t=Sum("quantity_remaining"))["t"] or 0
        if total <= 0:
            stock_outs += 1

    consumption_trend = []
    d = date.fromisoformat(str(date_from))
    end = date.fromisoformat(str(date_to))
    while d <= end:
        qty = StockTransaction.objects.filter(
            transaction_type=StockTransactionType.STOCK_OUT, created_at__date=d
        ).aggregate(t=Sum("quantity"))["t"] or 0
        consumption_trend.append({"name": d.isoformat(), "value": qty})
        d += timedelta(days=1)

    return {
        "total_dispenses": dispenses.count(),
        "stock_out_items": stock_outs,
        "low_stock_items": len(low_stock),
        "top_dispensed_medicines": [{"name": r["prescription__medicine__name"], "value": r["qty"]} for r in top_dispensed],
        "low_stock_detail": low_stock,
        "consumption_trend": consumption_trend,
    }


def theatre_emergency_blood_referral_report(date_from, date_to):
    from theatre.models import Surgery, SurgeryStatus
    from emergency.models import EmergencyVisit
    from api.models import ConsultationType

    surgeries = Surgery.objects.filter(theatre_in_at__date__gte=date_from, theatre_in_at__date__lte=date_to)
    completed_surgeries = surgeries.filter(status=SurgeryStatus.COMPLETED)
    emergency_bookings = completed_surgeries.filter(booking__priority="EMERGENCY").count() if hasattr(completed_surgeries.model, "booking") else 0

    emergency_visits = EmergencyVisit.objects.filter(arrived_at__date__gte=date_from, arrived_at__date__lte=date_to) \
        if hasattr(EmergencyVisit, "arrived_at") else EmergencyVisit.objects.none()

    try:
        from bloodbank.models import BloodIssue, BloodDonation
        blood_collected = BloodDonation.objects.filter(donation_date__date__gte=date_from, donation_date__date__lte=date_to).count()
        blood_issued = BloodIssue.objects.filter(issued_at__date__gte=date_from, issued_at__date__lte=date_to).count()
    except Exception:
        blood_collected = blood_issued = None

    try:
        from medrecords.models import Referral
        referrals_in = Referral.objects.filter(direction="INCOMING", created_at_display__date__gte=date_from, created_at_display__date__lte=date_to).count()
        referrals_out = Referral.objects.filter(direction="OUTGOING", created_at_display__date__gte=date_from, created_at_display__date__lte=date_to).count()
    except Exception:
        referrals_in = referrals_out = None

    return {
        "total_surgeries": surgeries.count(),
        "completed_surgeries": completed_surgeries.count(),
        "emergency_surgeries": emergency_bookings,
        "total_emergency_visits": emergency_visits.count(),
        "blood_units_collected": blood_collected,
        "blood_units_issued": blood_issued,
        "referrals_received": referrals_in,
        "referrals_sent": referrals_out,
    }