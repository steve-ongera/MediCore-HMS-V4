#licensing/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import FacilityLicense
from .serializers import FacilityLicenseSerializer, FacilityLicenseAdminSerializer
from .permissions import CanViewLicense


class FacilityLicenseView(APIView):
    permission_classes = [CanViewLicense]

    def get(self, request):
        license_obj = FacilityLicense.objects.first()
        if not license_obj:
            return Response(None)
        return Response(FacilityLicenseSerializer(license_obj).data)

    def patch(self, request):
        if not (request.user.is_authenticated and request.user.is_superuser):
            raise PermissionDenied("Only MediCore's support team can modify license settings. Please contact MediCore to request a change.")

        license_obj = FacilityLicense.objects.first()
        if not license_obj:
            serializer = FacilityLicenseAdminSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            license_obj = serializer.save()
        else:
            serializer = FacilityLicenseAdminSerializer(license_obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            license_obj = serializer.save()

        return Response(FacilityLicenseSerializer(license_obj).data)