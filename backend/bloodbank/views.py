from datetime import date, timedelta

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Patient
from api.permissions import ReadOnlyOrSuperAdmin

from .models import (
    BloodDonor, DonorStatus, BloodDonation, BloodUnit, UnitStatus,
    BloodRequest, RequestStatus, BloodIssue,
)
from .serializers import (
    BloodDonorSerializer, BloodDonationSerializer, BloodUnitSerializer,
    BloodRequestSerializer, BloodRequestListSerializer, CreateBloodRequestSerializer,
    IssueUnitSerializer, ScreenUnitSerializer, BloodIssueSerializer,
)
from .services import compute_expiry_date, is_compatible, raise_bloodbank_invoice


class BloodDonorViewSet(BaseModelViewSet):
    queryset = BloodDonor.objects.all()
    serializer_class = BloodDonorSerializer
    filterset_fields = ["blood_group", "status"]
    search_fields = ["donor_number", "full_name", "national_id", "phone"]

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="eligible")
    def eligible(self, request):
        qs = [d for d in self.get_queryset() if d.is_currently_eligible]
        return Response(BloodDonorSerializer(qs, many=True).data)


class BloodDonationViewSet(BaseModelViewSet):
    queryset = BloodDonation.objects.select_related("donor").all()
    serializer_class = BloodDonationSerializer
    filterset_fields = ["donor"]

    def create(self, request, *args, **kwargs):
        """
        Records a donation and immediately creates a QUARANTINED BloodUnit
        from it — units aren't AVAILABLE until screened via BloodUnit.screen.
        """
        serializer = BloodDonationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            donation = serializer.save(collected_by=request.user)
            donor = donation.donor
            collection_date = date.today()
            BloodUnit.objects.create(
                donation=donation, blood_group=donor.blood_group,
                collection_date=collection_date,
                expiry_date=compute_expiry_date(collection_date, "WHOLE_BLOOD"),
                volume_ml=donation.volume_ml,
                status=UnitStatus.QUARANTINED,
            )

        return Response(BloodDonationSerializer(donation).data, status=status.HTTP_201_CREATED)


class BloodUnitViewSet(BaseModelViewSet):
    queryset = BloodUnit.objects.select_related("donation__donor").all()
    serializer_class = BloodUnitSerializer
    filterset_fields = ["blood_group", "component_type", "status"]
    search_fields = ["unit_number"]

    @action(detail=False, methods=["get"], url_path="inventory")
    def inventory(self, request):
        """Grouped counts by blood group + component type, for the dashboard."""
        from django.db.models import Count
        qs = self.get_queryset().filter(status=UnitStatus.AVAILABLE)
        grouped = list(qs.values("blood_group", "component_type").annotate(count=Count("id")).order_by("blood_group"))
        return Response(grouped)

    @action(detail=False, methods=["get"], url_path="expiring-soon")
    def expiring_soon(self, request):
        cutoff = date.today() + timedelta(days=7)
        qs = self.get_queryset().filter(status=UnitStatus.AVAILABLE, expiry_date__lte=cutoff, expiry_date__gte=date.today())
        return Response(BloodUnitSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="screen")
    def screen(self, request, pk=None):
        unit = self.get_object()
        if unit.status != UnitStatus.QUARANTINED:
            raise ValidationError({"detail": "Only quarantined units can be screened."})
        serializer = ScreenUnitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        unit.screening_passed = data["screening_passed"]
        unit.screening_notes = data.get("screening_notes", "")
        if "unit_price" in data:
            unit.unit_price = data["unit_price"]
        unit.status = UnitStatus.AVAILABLE if data["screening_passed"] else UnitStatus.DISCARDED
        unit.save(update_fields=["screening_passed", "screening_notes", "unit_price", "status"])
        return Response(BloodUnitSerializer(unit).data)

    @action(detail=True, methods=["post"], url_path="discard")
    def discard(self, request, pk=None):
        unit = self.get_object()
        if unit.status in (UnitStatus.ISSUED, UnitStatus.DISCARDED):
            raise ValidationError({"detail": "This unit cannot be discarded."})
        unit.status = UnitStatus.DISCARDED
        unit.save(update_fields=["status"])
        return Response(BloodUnitSerializer(unit).data)


class BloodRequestViewSet(BaseModelViewSet):
    queryset = BloodRequest.objects.select_related("patient").prefetch_related("issues__unit").all()
    filterset_fields = ["status", "priority", "patient_blood_group"]
    search_fields = ["request_number", "patient__full_name", "patient__hospital_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return BloodRequestListSerializer
        return BloodRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateBloodRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = Patient.objects.filter(pk=data["patient"]).first()
        if not patient:
            raise ValidationError({"patient": "Patient not found."})

        blood_request = BloodRequest.objects.create(
            patient=patient, patient_blood_group=data["patient_blood_group"],
            component_type=data["component_type"], units_requested=data.get("units_requested", 1),
            priority=data.get("priority", "ROUTINE"), clinical_indication=data.get("clinical_indication", ""),
            admission_id=data.get("admission"), emergency_visit_id=data.get("emergency_visit"),
            surgery_id=data.get("surgery"), delivery_record_id=data.get("delivery_record"),
            requested_by=request.user,
        )
        return Response(BloodRequestSerializer(blood_request).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="compatible-units")
    def compatible_units(self, request, pk=None):
        blood_request = self.get_object()
        compatible_groups = [g for g in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
                              if is_compatible(blood_request.patient_blood_group, g)]
        units = BloodUnit.objects.filter(
            blood_group__in=compatible_groups, component_type=blood_request.component_type,
            status=UnitStatus.AVAILABLE,
        ).order_by("expiry_date")
        return Response(BloodUnitSerializer(units, many=True).data)

    @action(detail=True, methods=["post"], url_path="issue-unit")
    def issue_unit(self, request, pk=None):
        blood_request = self.get_object()
        if blood_request.status not in (RequestStatus.PENDING, RequestStatus.CROSS_MATCHED):
            raise ValidationError({"detail": "This request cannot receive more units."})

        serializer = IssueUnitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        unit = BloodUnit.objects.filter(pk=data["unit"], status=UnitStatus.AVAILABLE).first()
        if not unit:
            raise ValidationError({"unit": "Unit not found or not available."})

        compatible = is_compatible(blood_request.patient_blood_group, unit.blood_group)
        if not compatible:
            raise ValidationError({"unit": f"Unit blood group {unit.blood_group} is not compatible with recipient {blood_request.patient_blood_group}."})

        with transaction.atomic():
            invoice = raise_bloodbank_invoice(
                blood_request.patient,
                f"Blood Unit - {unit.unit_number} ({unit.blood_group} {unit.component_type}) - {blood_request.request_number}",
                unit.unit_price, user=request.user,
            )
            issue = BloodIssue.objects.create(
                request=blood_request, unit=unit, cross_match_compatible=True,
                issued_by=request.user, invoice=invoice, notes=data.get("notes", ""),
            )
            unit.status = UnitStatus.ISSUED
            unit.save(update_fields=["status"])

            issued_count = blood_request.issues.count()
            blood_request.status = (
                RequestStatus.ISSUED if issued_count >= blood_request.units_requested else RequestStatus.CROSS_MATCHED
            )
            blood_request.save(update_fields=["status"])

        return Response(BloodIssueSerializer(issue).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        blood_request = self.get_object()
        if blood_request.status == RequestStatus.ISSUED:
            raise ValidationError({"detail": "Cannot cancel a fully issued request."})
        blood_request.status = RequestStatus.CANCELLED
        blood_request.save(update_fields=["status"])
        return Response(BloodRequestSerializer(blood_request).data)

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        qs = self.get_queryset().filter(status__in=[RequestStatus.PENDING, RequestStatus.CROSS_MATCHED])
        return Response(BloodRequestListSerializer(qs, many=True).data)