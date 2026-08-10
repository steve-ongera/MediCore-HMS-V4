from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from api.permissions import IsAccountant, HasRole
from api.models import Role

def user_display(user):
    if not user:
        return ""
    return getattr(user, "full_name", None) or getattr(user, "get_full_name", lambda: "")() or str(user)

from . import services
from .pagination import MOHReportPagination
from .utils import apply_search, apply_exact_filters, stream_csv


class IsMOHReportViewer(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.SUPER_ADMIN, Role.HEALTH_RECORDS_OFFICER, Role.MEDICAL_RECORDS_OFFICER, Role.ACCOUNTANT]
        return super().has_permission(request, view)


# ---------------------------------------------------------------------------
# Aggregate summary reports (charts/KPIs) — unchanged
# ---------------------------------------------------------------------------

class BaseMOHReportView(APIView):
    permission_classes = [IsMOHReportViewer]
    service_fn = None

    def get(self, request):
        try:
            date_from, date_to = services._date_range(request)
            data = self.service_fn(date_from, date_to)
            return Response({"date_from": date_from, "date_to": date_to, **data})
        except Exception as exc:
            import logging
            logging.getLogger("moh").exception(f"{self.__class__.__name__} failed")
            return Response({"detail": f"Report failed: {exc}"}, status=500)


class OPDReportView(BaseMOHReportView):
    service_fn = staticmethod(services.opd_report)


class InpatientCapacityReportView(BaseMOHReportView):
    service_fn = staticmethod(services.inpatient_capacity_report)


class MCHReportView(BaseMOHReportView):
    service_fn = staticmethod(services.mch_report)


class MortalityReportView(BaseMOHReportView):
    service_fn = staticmethod(services.mortality_report)


class DiseaseSurveillanceReportView(BaseMOHReportView):
    service_fn = staticmethod(services.disease_surveillance_report)


class LabRadiologyReportView(BaseMOHReportView):
    service_fn = staticmethod(services.lab_radiology_report)


class PharmacyCommoditiesReportView(BaseMOHReportView):
    service_fn = staticmethod(services.pharmacy_commodities_report)


class TheatreEmergencyBloodReferralReportView(BaseMOHReportView):
    service_fn = staticmethod(services.theatre_emergency_blood_referral_report)


# ---------------------------------------------------------------------------
# Detail tables — paginated, searchable, filterable, downloadable raw records
# backing each aggregate report above.
# ---------------------------------------------------------------------------

class BaseMOHReportDetailView(ListAPIView):
    """
    Common contract for every detail table:
      ?page=&page_size=          pagination (max 200/page)
      ?search=                   OR-matched icontains across `search_fields`
      ?<filter param>=           exact match, see `filter_fields`
      ?date_from=&date_to=       range filter on `date_field`
      ?export=csv                streams ALL matching rows (ignores pagination)
    """
    permission_classes = [IsMOHReportViewer]
    pagination_class = MOHReportPagination

    search_fields = []
    filter_fields = []
    date_field = None
    date_field_is_datetime = True  # True: filters via `<date_field>__date__gte/lte`. Set False for plain DateFields.
    csv_filename = "report.csv"
    csv_columns = []

    def get_base_queryset(self):
        raise NotImplementedError

    def get_queryset(self):
        qs = self.get_base_queryset()
        params = self.request.query_params

        qs = apply_search(qs, params.get("search"), self.search_fields)
        qs = apply_exact_filters(qs, params, self.filter_fields)

        if self.date_field:
            date_from, date_to = services._date_range(self.request)
            lookup_base = f"{self.date_field}__date" if self.date_field_is_datetime else self.date_field
            qs = qs.filter(**{f"{lookup_base}__gte": date_from, f"{lookup_base}__lte": date_to})

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        if request.query_params.get("export") == "csv":
            return stream_csv(queryset, self.csv_columns, self.csv_filename)

        return super().list(request, *args, **kwargs)


class InpatientAdmissionDetailView(BaseMOHReportDetailView):
    from .serializers import AdmissionListSerializer
    serializer_class = AdmissionListSerializer

    search_fields = ["admission_number", "patient__full_name", "admission_diagnosis"]
    filter_fields = ["status", "admission_type", "discharge_type", ("ward", "bed__ward_id")]
    date_field = "admission_date"  # DateTimeField — date_field_is_datetime stays True (default)
    csv_filename = "inpatient_admissions.csv"
    csv_columns = [
        ("Admission #", "admission_number"),
        ("Patient", lambda a: getattr(a.patient, "full_name", "")),
        ("Admission Date", "admission_date"),
        ("Type", "admission_type"),
        ("Diagnosis", "admission_diagnosis"),
        ("Ward", lambda a: getattr(getattr(a.bed, "ward", None), "name", "")),
        ("Bed", lambda a: getattr(a.bed, "bed_number", "")),
        ("Attending Doctor", lambda a: getattr(a.attending_doctor, "full_name", str(a.attending_doctor) if a.attending_doctor_id else "")),
        ("Status", "status"),
        ("Discharge Date", "discharge_date"),
        ("Discharge Type", "discharge_type"),
        ("Length of Stay (days)", lambda a: a.length_of_stay_days),
    ]

    def get_base_queryset(self):
        from inpatient.models import Admission
        return (
            Admission.objects.select_related(
                "patient", "bed", "bed__ward", "admitted_by", "admitting_doctor", "attending_doctor"
            )
            .order_by("-admission_date")
        )
        
        
        

class OPDVisitDetailView(BaseMOHReportDetailView):
    from .serializers import VisitListSerializer
    serializer_class = VisitListSerializer

    search_fields = ["patient__full_name"]
    filter_fields = ["department", ("gender", "patient__gender"), "consultation_type"]
    date_field = "visit_date"  # DateTimeField, per opd_report()'s visit_date__date__gte usage
    csv_filename = "opd_visits.csv"
    csv_columns = [
        ("Patient", lambda v: getattr(v.patient, "full_name", "")),
        ("Gender", lambda v: getattr(v.patient, "gender", "")),
        ("Visit Date", "visit_date"),
        ("Department", lambda v: getattr(v.department, "name", "")),
        ("Consultation Type", "consultation_type"),
    ]

    def get_base_queryset(self):
        from api.models import Visit
        return Visit.objects.select_related("patient", "department").order_by("-visit_date")
    
    
    
class DiseaseSurveillanceDetailView(BaseMOHReportDetailView):
    from .serializers import ConsultationDiagnosisListSerializer
    serializer_class = ConsultationDiagnosisListSerializer

    search_fields = ["icd10_code__code", "icd10_code__description", "consultation__visit__patient__full_name"]
    filter_fields = [("icd10_code", "icd10_code__code"), "is_coding_verified"]
    date_field = "consultation__started_at"
    csv_filename = "disease_surveillance.csv"
    csv_columns = [
        ("Patient", lambda d: d.consultation.visit.patient.full_name),
        ("Consultation Date", lambda d: d.consultation.started_at),
        ("ICD-10 Code", lambda d: d.icd10_code.code),
        ("Diagnosis", lambda d: d.icd10_code.description),
        ("Primary", lambda d: "Yes" if d.is_primary else "No"),
        ("Coding Verified", lambda d: "Yes" if d.is_coding_verified else "No"),
    ]

    def get_base_queryset(self):
        from api.models import ConsultationDiagnosis
        return (
            ConsultationDiagnosis.objects
            .select_related("consultation", "consultation__visit", "consultation__visit__patient", "icd10_code")
            .order_by("-consultation__started_at")
        )
        
        

class MortalityDetailView(BaseMOHReportDetailView):
    from .serializers import DeathRegisterListSerializer
    serializer_class = DeathRegisterListSerializer

    search_fields = ["registration_number", "deceased_name", "cause_of_death"]
    filter_fields = [("gender", "patient__gender")]
    date_field = "date_of_death"  # DateTimeField
    csv_filename = "mortality_register.csv"
    csv_columns = [
        ("Registration #", "registration_number"),
        ("Deceased Name", "deceased_name"),
        ("Linked Patient", lambda d: getattr(d.patient, "full_name", "") if d.patient_id else ""),
        ("Date of Death", "date_of_death"),
        ("Cause of Death", "cause_of_death"),
        ("Certifying Doctor", lambda d: user_display(d.certifying_doctor)),
    ]

    def get_base_queryset(self):
        from medrecords.models import DeathRegister
        return DeathRegister.objects.select_related("patient", "certifying_doctor").order_by("-date_of_death")
    
    
    

class PharmacyDispenseDetailView(BaseMOHReportDetailView):
    from .serializers import PharmacyDispenseListSerializer
    serializer_class = PharmacyDispenseListSerializer

    search_fields = [
        "prescription__medicine__name",
        "prescription__consultation__visit__patient__full_name",
    ]
    filter_fields = ["status", "payment_method"]
    date_field = "completed_at"  # DateTimeField, nullable — pending dispenses auto-excluded by range filter
    csv_filename = "pharmacy_dispenses.csv"
    csv_columns = [
        ("Patient", lambda d: getattr(d.prescription.consultation.visit.patient, "full_name", "")),
        ("Medicine", lambda d: d.prescription.medicine.name),
        ("Dosage", lambda d: f"{d.prescription.dosage} · {d.prescription.frequency}"),
        ("Quantity", "quantity_dispensed"),
        ("Payment Method", "payment_method"),
        ("Status", "status"),
        ("Dispensed By", lambda d: user_display(d.dispensed_by)),
        ("Dispensed At", "dispensed_at"),
        ("Completed At", "completed_at"),
    ]

    def get_base_queryset(self):
        from api.models import PharmacyDispense
        return (
            PharmacyDispense.objects
            .select_related(
                "prescription", "prescription__medicine",
                "prescription__consultation", "prescription__consultation__visit",
                "prescription__consultation__visit__patient", "dispensed_by",
            )
            .order_by("-dispensed_at")
        )
        
        
        

class MCHDeliveryDetailView(BaseMOHReportDetailView):
    from .serializers import DeliveryRecordListSerializer
    serializer_class = DeliveryRecordListSerializer

    search_fields = ["delivery_number", "profile__mother__full_name", "profile__anc_number"]
    filter_fields = ["mode_of_delivery", "outcome"]
    date_field = "delivery_date"  # DateTimeField, manually set (not auto_now_add) but same lookup pattern
    csv_filename = "mch_deliveries.csv"
    csv_columns = [
        ("Delivery #", "delivery_number"),
        ("Mother", lambda d: d.profile.mother.full_name),
        ("ANC #", lambda d: d.profile.anc_number),
        ("Delivery Date", "delivery_date"),
        ("Mode", "mode_of_delivery"),
        ("Outcome", "outcome"),
        ("Place", "place_of_delivery"),
        ("Attended By", lambda d: user_display(d.attended_by)),
        ("Complications", "complications"),
        ("Blood Loss (ml)", "blood_loss_ml"),
    ]

    def get_base_queryset(self):
        from mch.models import DeliveryRecord
        return (
            DeliveryRecord.objects
            .select_related("profile", "profile__mother", "attended_by")
            .order_by("-delivery_date")
        )