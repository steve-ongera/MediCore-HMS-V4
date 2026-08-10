#moh/services.py
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, Q


def _date_range(request):
    date_from = request.query_params.get("date_from") or str(date.today().replace(day=1))
    date_to = request.query_params.get("date_to") or str(date.today())
    return date_from, date_to


def opd_report(date_from, date_to):
    from api.models import Visit, Patient
    from django.db.models import Min

    visits = Visit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to)
    total_visits = visits.count()

    patient_ids_in_range = visits.values_list("patient", flat=True).distinct()
    unique_patients = patient_ids_in_range.count()

    # One query for everyone's first-ever visit date, instead of one query per patient
    first_visit_dates = dict(
        Visit.objects.filter(patient_id__in=patient_ids_in_range)
        .values("patient")
        .annotate(first_visit=Min("visit_date"))
        .values_list("patient", "first_visit")
    )
    new_count = sum(
        1 for pid in patient_ids_in_range
        if first_visit_dates.get(pid) and date_from <= str(first_visit_dates[pid].date()) <= date_to
    )
    returning_count = unique_patients - new_count

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
    from datetime import date, timedelta

    result = {
        "total_admissions": None,
        "total_discharges": None,
        "average_length_of_stay_days": None,
        "total_beds": None,
        "currently_occupied_beds": None,
        "bed_occupancy_rate_percent": None,
        "icu_total_beds": None,
        "icu_occupied_beds": None,
        "by_ward": [],
        "admission_trend": [],
    }

    try:
        from inpatient.models import Admission
        admissions_in_period = Admission.objects.filter(
            admission_date__date__gte=date_from, admission_date__date__lte=date_to
        )
        discharges_in_period = Admission.objects.filter(
            discharge_date__isnull=False,
            discharge_date__date__gte=date_from, discharge_date__date__lte=date_to,
        )
        result["total_admissions"] = admissions_in_period.count()
        result["total_discharges"] = discharges_in_period.count()

        los_values = [
            (a.discharge_date - a.admission_date).days
            for a in discharges_in_period if a.discharge_date and a.admission_date
        ]
        result["average_length_of_stay_days"] = round(sum(los_values) / len(los_values), 1) if los_values else 0
    except Exception:
        import logging
        logging.getLogger("moh").exception("inpatient_capacity_report: admissions section failed")

    try:
        from inpatient.models import Bed
        result["total_beds"] = Bed.objects.count()
    except Exception:
        import logging
        logging.getLogger("moh").exception("inpatient_capacity_report: bed count failed")

    try:
        from inpatient.models import Bed
        result["currently_occupied_beds"] = Bed.objects.filter(status__iexact="OCCUPIED").count()
        if result["total_beds"] and result["total_beds"] > 0:
            result["bed_occupancy_rate_percent"] = round((result["currently_occupied_beds"] / result["total_beds"]) * 100, 1)
    except Exception:
        import logging
        logging.getLogger("moh").exception("inpatient_capacity_report: occupied bed count failed")

    try:
        from inpatient.models import Bed, Ward
        by_ward = []
        for ward in Ward.objects.all():
            ward_beds = Bed.objects.filter(ward=ward).count()
            ward_occupied = Bed.objects.filter(ward=ward, status__iexact="OCCUPIED").count()
            by_ward.append({"name": ward.name, "total": ward_beds, "occupied": ward_occupied})
        result["by_ward"] = by_ward
    except Exception:
        import logging
        logging.getLogger("moh").exception("inpatient_capacity_report: by_ward section failed")

    try:
        from inpatient.models import Admission
        admission_trend = []
        d = date.fromisoformat(str(date_from))
        end = date.fromisoformat(str(date_to))
        while d <= end:
            admission_trend.append({"name": d.isoformat(), "value": Admission.objects.filter(admission_date__date=d).count()})
            d += timedelta(days=1)
        result["admission_trend"] = admission_trend
    except Exception:
        import logging
        logging.getLogger("moh").exception("inpatient_capacity_report: admission_trend section failed")

    try:
        from icu.models import ICUBed
        result["icu_total_beds"] = ICUBed.objects.count()
        result["icu_occupied_beds"] = ICUBed.objects.filter(status__iexact="OCCUPIED").count()
    except Exception:
        pass  # ICU module optional — no error log needed for a genuinely missing app

    return result


def mch_report(date_from, date_to):
    from mch.models import AntenatalProfile, ANCVisit, DeliveryRecord, DeliveryMode, PostnatalVisit, ChildImmunization

    anc_registrations = AntenatalProfile.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to).count()
    anc_visits = ANCVisit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to).count()

    deliveries = DeliveryRecord.objects.filter(delivery_date__date__gte=date_from, delivery_date__date__lte=date_to)

    total_deliveries = deliveries.count()
    by_mode = list(deliveries.values("mode_of_delivery").annotate(count=Count("id"))) if total_deliveries else []
    c_sections = deliveries.filter(mode_of_delivery=DeliveryMode.CAESAREAN).count() if total_deliveries else 0

    live_births = deliveries.filter(outcome="LIVE_BIRTH").count()
    stillbirths = deliveries.filter(outcome="STILLBIRTH").count()

    pnc_visits = PostnatalVisit.objects.filter(visit_date__date__gte=date_from, visit_date__date__lte=date_to).count()

    immunizations_given = ChildImmunization.objects.filter(
        status="GIVEN", given_date__gte=date_from, given_date__lte=date_to
    ).count()

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
        "by_delivery_mode": [{"name": r["mode_of_delivery"], "value": r["count"]} for r in by_mode],
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