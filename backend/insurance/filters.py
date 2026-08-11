import django_filters
from .models import InsuranceClaim, ClaimStatus


class InsuranceClaimFilter(django_filters.FilterSet):
    insurer = django_filters.UUIDFilter(field_name="policy__insurer_id")
    status = django_filters.ChoiceFilter(choices=ClaimStatus.choices)
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = InsuranceClaim
        fields = ["status", "insurer", "date_from", "date_to"]