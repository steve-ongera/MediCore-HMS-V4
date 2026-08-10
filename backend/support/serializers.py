# support/serializers.py
from rest_framework import serializers
from .models import ContactInquiry


class ContactInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInquiry
        fields = ["id", "name", "email", "phone", "facility_name", "topic", "message", "status", "submitted_at"]
        read_only_fields = ["id", "status", "submitted_at"]