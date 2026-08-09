import csv

from django.db.models import Q
from django.http import StreamingHttpResponse


class Echo:
    """File-like object whose write() just returns the value — lets csv.writer
    stream rows via a generator instead of buffering the whole export in memory."""
    def write(self, value):
        return value


def resolve_accessor(obj, accessor):
    """accessor is either a callable(obj)->value or a dotted attribute path,
    e.g. 'patient.full_name' or 'bed.ward.name'. Missing links resolve to ''."""
    if callable(accessor):
        return accessor(obj)
    value = obj
    for part in accessor.split("."):
        value = getattr(value, part, None)
        if value is None:
            return ""
    return value


def stream_csv(queryset, columns, filename):
    """columns: list of (header, accessor) tuples. Streams the FULL filtered
    queryset (ignores pagination) so downloads always contain everything the
    current filters/search matched."""
    def row_generator():
        writer = csv.writer(Echo())
        yield writer.writerow([header for header, _ in columns])
        for obj in queryset.iterator(chunk_size=500):
            yield writer.writerow([resolve_accessor(obj, accessor) for _, accessor in columns])

    response = StreamingHttpResponse(row_generator(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def apply_search(queryset, search_term, search_fields):
    if not search_term or not search_fields:
        return queryset
    q = Q()
    for field in search_fields:
        q |= Q(**{f"{field}__icontains": search_term})
    return queryset.filter(q)


def apply_exact_filters(queryset, query_params, filter_fields):
    """Exact-match filter for any of `filter_fields` present in the querystring.
    filter_fields items can be 'status' (maps 1:1) or a tuple ('ward', 'bed__ward_id')
    to expose a friendlier query param name than the ORM lookup."""
    filters = {}
    for field in filter_fields:
        param_name, lookup = field if isinstance(field, tuple) else (field, field)
        value = query_params.get(param_name)
        if value not in (None, ""):
            filters[lookup] = value
    return queryset.filter(**filters) if filters else queryset