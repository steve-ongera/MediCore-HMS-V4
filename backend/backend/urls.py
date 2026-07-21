from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/", include("inpatient.urls")),
    path("api/", include("mch.urls")),
    path("api/", include("emergency.urls")),
    path("api/", include("insurance.urls")),
    path("api/", include("etims.urls")),
    path("api/", include("assets.urls")),
    path("api/", include("procurement.urls")),
    path("api/", include("hr.urls")),
    path("api/", include("ambulance.urls")),
    path("api/", include("mortuary.urls")),
    path("api/", include("theatre.urls")),
    path("api/", include("finance.urls")),
    path("api/", include("bloodbank.urls")),
    path("api/", include("dental.urls")),

    # OpenAPI / Swagger documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    
# ─────────────────────────────────────────────────────────────────────────────
# SITE BRANDING
# ─────────────────────────────────────────────────────────────────────────────
admin.site.site_header  = "Medicore HMIS"
admin.site.site_title   = "HMIS  Admin"
admin.site.index_title  = "Operations Dashboard"
