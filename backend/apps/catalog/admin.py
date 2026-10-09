from datetime import timedelta

from django import forms
from django.contrib import admin, messages
from django.db import transaction
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import reverse
from unfold.admin import ModelAdmin
from unfold.decorators import action, display

from apps.core.models import SiteSettings

from .models import (
    City,
    Provider,
    SeatStatus,
    SessionSlot,
    TestFormat,
    TestSession,
    TestType,
    Venue,
)


@admin.register(City)
class CityAdmin(ModelAdmin):
    list_display = ["name", "slug", "order", "is_active"]
    list_editable = ["order", "is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    fields = ["name", "slug", "intro", "order", "is_active"]


@admin.register(Venue)
class VenueAdmin(ModelAdmin):
    list_display = ["name", "city", "address", "is_active"]
    list_filter = ["city", "is_active"]
    search_fields = ["name", "address"]


@admin.register(TestType)
class TestTypeAdmin(ModelAdmin):
    list_display = ["name", "code", "is_ukvi", "order", "is_active"]
    list_editable = ["order", "is_active"]


class BulkCreateForm(forms.Form):
    provider = forms.ChoiceField(choices=Provider.choices, initial=Provider.BRITISH_COUNCIL)
    cities = forms.ModelMultipleChoiceField(
        queryset=City.objects.filter(is_active=True), widget=forms.CheckboxSelectMultiple
    )
    test_types = forms.ModelMultipleChoiceField(
        queryset=TestType.objects.filter(is_active=True), widget=forms.CheckboxSelectMultiple
    )
    formats = forms.MultipleChoiceField(
        choices=TestFormat.choices, widget=forms.CheckboxSelectMultiple, initial=[TestFormat.COMPUTER]
    )
    slots = forms.MultipleChoiceField(
        choices=SessionSlot.choices, widget=forms.CheckboxSelectMultiple, initial=[SessionSlot.MORNING]
    )
    first_date = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}))
    repeat = forms.IntegerField(
        min_value=1, max_value=52, initial=1, help_text="How many dates to create, including the first."
    )
    every_days = forms.IntegerField(
        min_value=1, max_value=60, initial=7, help_text="Days between repeated dates (7 = weekly)."
    )
    fee_npr = forms.IntegerField(min_value=0, label="Fee (NPR)")
    seats_total = forms.IntegerField(min_value=0, label="Seats per date")
    speaking_note = forms.CharField(required=False, max_length=255)
    is_visible = forms.BooleanField(required=False, initial=True, label="Visible to students")


class SeatStatusFilter(admin.SimpleListFilter):
    title = "seat status"
    parameter_name = "seat_status"

    def lookups(self, request, model_admin):
        return SeatStatus.choices

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        threshold = SiteSettings.load().low_seat_threshold
        pks = [s.pk for s in queryset if s.seat_status(threshold) == self.value()]
        return queryset.filter(pk__in=pks)


@admin.register(TestSession)
class TestSessionAdmin(ModelAdmin):
    list_display = [
        "date",
        "provider",
        "slot",
        "city",
        "test_type",
        "format",
        "fee_npr",
        "seats",
        "status_chip",
        "registration_closes_on",
        "is_visible",
    ]
    list_editable = ["is_visible"]
    list_filter = ["provider", "city", "test_type", "format", "is_visible", "date", SeatStatusFilter]
    list_select_related = ["city", "venue", "test_type"]
    search_fields = ["city__name", "venue__name", "notes"]
    date_hierarchy = "date"
    autocomplete_fields = ["venue"]
    actions = ["make_visible", "make_hidden", "duplicate_next_week"]
    actions_list = ["bulk_create"]
    list_per_page = 50
    fieldsets = (
        ("When and where", {"fields": ("date", "provider", "slot", "city", "venue")}),
        ("Test", {"fields": ("test_type", "format", "fee_npr")}),
        (
            "Seats",
            {
                "fields": ("seats_total", "seats_booked"),
                "description": "Seats booked changes automatically when you confirm or cancel a booking.",
            },
        ),
        (
            "Deadlines",
            {
                "fields": ("registration_closes_on", "results_date", "speaking_note"),
                "description": "Leave the dates empty to fill them in automatically.",
            },
        ),
        ("Visibility", {"fields": ("is_visible", "notes")}),
    )

    @display(description="Seats")
    def seats(self, obj):
        return f"{obj.seats_booked} / {obj.seats_total}"

    @display(
        description="Status",
        label={
            SeatStatus.AVAILABLE.label: "success",
            SeatStatus.FEW.label: "warning",
            SeatStatus.FULL.label: "danger",
            SeatStatus.CLOSED.label: "info",
        },
    )
    def status_chip(self, obj):
        return SeatStatus(obj.seat_status(SiteSettings.load().low_seat_threshold)).label

    @admin.action(description="Show selected dates to students")
    def make_visible(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_visible=True)} dates are now visible.")

    @admin.action(description="Hide selected dates from students")
    def make_hidden(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_visible=False)} dates are now hidden.")

    @admin.action(description="Duplicate selected dates one week later")
    def duplicate_next_week(self, request, queryset):
        created = 0
        with transaction.atomic():
            for s in queryset:
                new_date = s.date + timedelta(days=7)
                _, was_created = TestSession.objects.get_or_create(
                    date=new_date,
                    provider=s.provider,
                    slot=s.slot,
                    city=s.city,
                    test_type=s.test_type,
                    format=s.format,
                    defaults={
                        "venue": s.venue,
                        "fee_npr": s.fee_npr,
                        "seats_total": s.seats_total,
                        "speaking_note": s.speaking_note,
                        "is_visible": False,
                    },
                )
                created += was_created
        self.message_user(
            request,
            f"{created} new dates created (hidden until you review them). Existing dates were skipped.",
            messages.SUCCESS,
        )

    @action(
        description="Bulk create dates", url_path="bulk-create", permissions=["add"], icon="calendar_add_on"
    )
    def bulk_create(self, request):
        form = BulkCreateForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            d = form.cleaned_data
            created = skipped = 0
            with transaction.atomic():
                for i in range(d["repeat"]):
                    day = d["first_date"] + timedelta(days=i * d["every_days"])
                    for city in d["cities"]:
                        venue = city.venues.filter(is_active=True).first()
                        for tt in d["test_types"]:
                            for fmt in d["formats"]:
                                if tt.is_ukvi and fmt == TestFormat.COMPUTER_WOP:
                                    skipped += len(d["slots"])
                                    continue
                                for slot in d["slots"]:
                                    _, was_created = TestSession.objects.get_or_create(
                                        date=day,
                                        provider=d["provider"],
                                        slot=slot,
                                        city=city,
                                        test_type=tt,
                                        format=fmt,
                                        defaults={
                                            "venue": venue,
                                            "fee_npr": d["fee_npr"],
                                            "seats_total": d["seats_total"],
                                            "speaking_note": d["speaking_note"],
                                            "is_visible": d["is_visible"],
                                        },
                                    )
                                    created += was_created
                                    skipped += not was_created
            self.message_user(
                request,
                f"Created {created} dates. Skipped {skipped} that already existed or are not allowed.",
            )
            return redirect(reverse("admin:catalog_testsession_changelist"))
        context = {**self.admin_site.each_context(request), "title": "Bulk create test dates", "form": form}
        return TemplateResponse(request, "admin/catalog/bulk_create.html", context)
