from django.contrib import admin, messages
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.urls import path, reverse
from django.utils.html import format_html, format_html_join
from unfold.admin import ModelAdmin
from unfold.decorators import display

from apps.core.admin import export_csv

from . import services
from .models import BookingRequest, BookingStatus, Inquiry, InquiryStatus


def _wa_link(phone: str) -> str:
    if not phone:
        return "-"
    return format_html(
        '<a href="https://wa.me/{}" target="_blank" rel="noopener">{}</a>', phone.lstrip("+"), phone
    )


@admin.register(BookingRequest)
class BookingRequestAdmin(ModelAdmin):
    list_display = [
        "reference",
        "student",
        "student_phone",
        "session",
        "status_chip",
        "whatsapp_clicked_at",
        "created_at",
    ]
    list_filter = ["status", "session__city", "session__test_type", "session__date"]
    list_select_related = ["user", "session__city", "session__test_type"]
    search_fields = ["reference", "user__email", "user__full_name", "user__phone"]
    date_hierarchy = "created_at"
    actions = ["mark_confirmed", "mark_cancelled", "export_selected"]
    list_per_page = 50
    readonly_fields = [
        "reference",
        "whatsapp_clicked_at",
        "created_at",
        "updated_at",
        "student_phone",
        "passport_links",
    ]
    fieldsets = (
        (None, {"fields": ("reference", "user", "student_phone", "session", "status", "admin_notes")}),
        (
            "Candidate",
            {
                "fields": (
                    "examinee",
                    "candidate_name",
                    "candidate_phone",
                    "candidate_email",
                    "date_of_birth",
                    "province",
                    "district",
                    "municipality",
                    "passport_links",
                )
            },
        ),
        ("History", {"fields": ("whatsapp_clicked_at", "created_at", "updated_at")}),
    )
    autocomplete_fields = ["user"]

    def get_urls(self):
        custom = [
            path(
                "<int:pk>/passport/<str:side>/",
                self.admin_site.admin_view(self.passport_view),
                name="bookings_bookingrequest_passport",
            )
        ]
        return custom + super().get_urls()

    def passport_view(self, request, pk: int, side: str):
        """Passports are private: only staff who may view bookings can open them, never a public URL."""
        booking = get_object_or_404(BookingRequest, pk=pk)
        if not self.has_view_permission(request, booking) or side not in ("front", "back"):
            raise Http404
        f = booking.passport_front if side == "front" else booking.passport_back
        if not f:
            raise Http404
        response = FileResponse(f.open("rb"))
        response["Cache-Control"] = "private, no-store"
        return response

    @display(description="Passport")
    def passport_links(self, obj):
        if not obj.pk or not obj.passport_front:
            return "Not uploaded"
        links = [
            format_html(
                '<a href="{}" target="_blank" rel="noopener">{}</a>',
                reverse("admin:bookings_bookingrequest_passport", args=[obj.pk, side]),
                label,
            )
            for side, label, f in (
                ("front", "Front", obj.passport_front),
                ("back", "Back", obj.passport_back),
            )
            if f
        ]
        return format_html_join(" · ", "{}", ((link,) for link in links))

    def get_readonly_fields(self, request, obj=None):
        base = list(super().get_readonly_fields(request, obj))
        # Moving a booking to another date would corrupt seat counts, so the date is fixed once created.
        return base + ["user", "session"] if obj else base

    @display(description="Student", ordering="user__full_name")
    def student(self, obj):
        return obj.user.full_name

    @display(description="Phone / WhatsApp")
    def student_phone(self, obj):
        return _wa_link(obj.user.phone)

    @display(
        description="Status",
        label={
            BookingStatus.INITIATED.label: "warning",
            BookingStatus.CONFIRMED.label: "success",
            BookingStatus.CANCELLED.label: "danger",
        },
    )
    def status_chip(self, obj):
        return obj.get_status_display()

    def save_model(self, request, obj, form, change):
        # Status changes go through the service so seats_booked stays correct.
        wanted = obj.status
        if change and "status" in form.changed_data:
            obj.status = form.initial["status"]
        elif not change:
            obj.status = BookingStatus.INITIATED
        super().save_model(request, obj, form, change)
        if wanted != obj.status:
            try:
                services.set_booking_status(obj.pk, wanted)
            except services.BookingError as e:
                messages.error(request, str(e))
            obj.refresh_from_db()

    def _bulk_status(self, request, queryset, status):
        done = 0
        for pk in queryset.values_list("pk", flat=True):
            try:
                services.set_booking_status(pk, status)
                done += 1
            except services.BookingError as e:
                messages.error(request, f"{BookingRequest.objects.get(pk=pk).reference}: {e}")
        if done:
            self.message_user(request, f"{done} bookings updated.", messages.SUCCESS)

    @admin.action(description="Mark selected as confirmed (uses a seat)")
    def mark_confirmed(self, request, queryset):
        self._bulk_status(request, queryset, BookingStatus.CONFIRMED)

    @admin.action(description="Mark selected as cancelled (frees the seat)")
    def mark_cancelled(self, request, queryset):
        self._bulk_status(request, queryset, BookingStatus.CANCELLED)

    @admin.action(description="Export selected to CSV")
    def export_selected(self, request, queryset):
        rows = queryset.select_related("user", "session__city", "session__test_type")

        class Flat:
            def reference(self, o):
                return o.reference

            def student(self, o):
                return o.user.full_name

            def email(self, o):
                return o.user.email

            def phone(self, o):
                return o.user.phone

            def test_date(self, o):
                return o.session.date

            def city(self, o):
                return o.session.city.name

            def test_type(self, o):
                return o.session.test_type.name

            def format(self, o):
                return o.session.get_format_display()

            def status(self, o):
                return o.status

            def created(self, o):
                return o.created_at

            def notes(self, o):
                return o.admin_notes

        cols = [
            "reference",
            "student",
            "email",
            "phone",
            "test_date",
            "city",
            "test_type",
            "format",
            "status",
            "created",
            "notes",
        ]
        return export_csv(Flat(), rows, cols, "booking-requests")


@admin.register(Inquiry)
class InquiryAdmin(ModelAdmin):
    list_display = [
        "name",
        "contact",
        "preferred_city",
        "test_type",
        "preferred_month",
        "status_chip",
        "created_at",
    ]
    list_filter = ["status", "preferred_city", "test_type", "created_at"]
    list_select_related = ["preferred_city", "test_type"]
    search_fields = ["name", "phone", "email", "message"]
    date_hierarchy = "created_at"
    actions = ["mark_contacted", "mark_closed", "export_selected"]
    readonly_fields = ["user", "created_at", "contact"]
    fields = [
        "name",
        "contact",
        "phone",
        "email",
        "preferred_city",
        "test_type",
        "format",
        "preferred_month",
        "message",
        "status",
        "admin_notes",
        "user",
        "created_at",
    ]

    @display(description="Phone / WhatsApp")
    def contact(self, obj):
        return _wa_link(obj.phone)

    @display(
        description="Status",
        label={
            InquiryStatus.NEW.label: "danger",
            InquiryStatus.CONTACTED.label: "warning",
            InquiryStatus.CLOSED.label: "success",
        },
    )
    def status_chip(self, obj):
        return obj.get_status_display()

    @admin.action(description="Mark selected as contacted")
    def mark_contacted(self, request, queryset):
        self.message_user(request, f"{queryset.update(status=InquiryStatus.CONTACTED)} inquiries updated.")

    @admin.action(description="Mark selected as closed")
    def mark_closed(self, request, queryset):
        self.message_user(request, f"{queryset.update(status=InquiryStatus.CLOSED)} inquiries updated.")

    @admin.action(description="Export selected to CSV")
    def export_selected(self, request, queryset):
        cols = [
            "name",
            "phone",
            "email",
            "preferred_city",
            "test_type",
            "format",
            "preferred_month",
            "message",
            "status",
            "created_at",
            "admin_notes",
        ]
        return export_csv(self, queryset.select_related("preferred_city", "test_type"), cols, "inquiries")
