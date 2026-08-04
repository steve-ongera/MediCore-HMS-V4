# licensing/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.permissions import IsSuperAdmin
from .models import FacilityLicense
from .serializers import FacilityLicenseSerializer


class FacilityLicenseView(APIView):
    """
    Single-object endpoint — GET returns the current license status (visible
    to Super Admin only, since remaining capacity is sensitive licensing
    info), PATCH updates it. Only MediCore/Super Admin should ever touch
    this — in a real SaaS rollout you'd lock PATCH to your own ops team's
    credentials rather than the client hospital's Super Admin, but for now
    it's exposed to Super Admin per your current auth model.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        license_obj = FacilityLicense.objects.first()
        if not license_obj:
            return Response(None)
        return Response(FacilityLicenseSerializer(license_obj).data)

    def patch(self, request):
        license_obj = FacilityLicense.objects.first()
        if not license_obj:
            license_obj = FacilityLicense.objects.create(**request.data)
        else:
            serializer = FacilityLicenseSerializer(license_obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(FacilityLicenseSerializer(license_obj).data)