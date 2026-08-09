from rest_framework.views import APIView
from rest_framework.response import Response

from api.permissions import IsAccountant, HasRole
from api.models import Role

from . import services


class IsMOHReportViewer(HasRole):
    def has_permission(self, request, view):
        view.allowed_roles = [Role.SUPER_ADMIN, Role.HEALTH_RECORDS_OFFICER, Role.MEDICAL_RECORDS_OFFICER, Role.ACCOUNTANT]
        return super().has_permission(request, view)


class BaseMOHReportView(APIView):
    permission_classes = [IsMOHReportViewer]
    service_fn = None

    def get(self, request):
        date_from, date_to = services._date_range(request)
        try:
            data = self.service_fn(date_from, date_to)
        except Exception as exc:
            return Response({"detail": f"Report failed: {exc}"}, status=500)
        return Response({"date_from": date_from, "date_to": date_to, **data})


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