from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from api.permissions import IsAccountant, HasRole
from api.models import Role

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