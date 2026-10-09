from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.bookings import api as bookings
from apps.catalog import api as catalog
from apps.core import api as core

api_v1 = [
    path("csrf/", core.CsrfView.as_view()),
    path("site/", core.SiteSettingsView.as_view()),
    path("faqs/", core.FAQListView.as_view()),
    path("content/", core.ContentBlockListView.as_view()),
    path("auth/", include("apps.accounts.urls")),
    path("cities/", catalog.CityListView.as_view()),
    path("test-types/", catalog.TestTypeListView.as_view()),
    path("sessions/", catalog.SessionListView.as_view()),
    path("sessions/<int:pk>/", catalog.SessionDetailView.as_view()),
    path("bookings/", bookings.BookingListCreateView.as_view()),
    path("bookings/<int:pk>/", bookings.BookingDetailView.as_view()),
    path("bookings/<int:pk>/whatsapp/", bookings.BookingWhatsAppView.as_view()),
    path("bookings/<int:pk>/cancel/", bookings.BookingCancelView.as_view()),
    path("regions/", core.RegionsView.as_view()),
    path("inquiries/", bookings.InquiryCreateView.as_view()),
    path("inquiries/mine/", bookings.MyInquiryListView.as_view()),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("healthz", lambda request: HttpResponse("ok")),
]
