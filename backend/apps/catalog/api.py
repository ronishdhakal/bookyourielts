import re

import django_filters
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny

from apps.core.models import SiteSettings

from .models import City, Provider, TestFormat, TestSession, TestType


def _visible_upcoming():
    return Q(sessions__is_visible=True, sessions__date__gte=timezone.localdate())


class CitySerializer(serializers.ModelSerializer):
    upcoming_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = City
        fields = ["id", "name", "slug", "intro", "upcoming_count"]


class TestTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestType
        fields = ["id", "code", "name", "is_ukvi", "description"]


class SessionSerializer(serializers.ModelSerializer):
    weekday = serializers.SerializerMethodField()
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    slot_label = serializers.CharField(source="get_slot_display", read_only=True)
    format_label = serializers.CharField(source="get_format_display", read_only=True)
    city = serializers.SerializerMethodField()
    venue = serializers.SerializerMethodField()
    test_type = TestTypeSerializer(read_only=True)
    seats_left = serializers.IntegerField(source="seats_available", read_only=True)
    seat_status = serializers.SerializerMethodField()
    seat_status_label = serializers.SerializerMethodField()
    is_bookable = serializers.SerializerMethodField()

    class Meta:
        model = TestSession
        fields = [
            "id",
            "date",
            "weekday",
            "provider",
            "provider_label",
            "slot",
            "slot_label",
            "city",
            "venue",
            "test_type",
            "format",
            "format_label",
            "fee_npr",
            "seats_left",
            "seat_status",
            "seat_status_label",
            "is_bookable",
            "registration_closes_on",
            "results_date",
            "speaking_note",
        ]

    def get_weekday(self, obj) -> str:
        return obj.date.strftime("%A")

    def get_city(self, obj) -> dict:
        return {"name": obj.city.name, "slug": obj.city.slug}

    def get_venue(self, obj) -> dict | None:
        return {"name": obj.venue.name, "address": obj.venue.address} if obj.venue else None

    def _status(self, obj) -> str:
        threshold = self.context.get("low_seat_threshold")
        if threshold is None:
            threshold = SiteSettings.load().low_seat_threshold
            self.context["low_seat_threshold"] = threshold
        return obj.seat_status(threshold)

    def get_seat_status(self, obj) -> str:
        return self._status(obj)

    def get_seat_status_label(self, obj) -> str:
        from .models import SeatStatus

        return SeatStatus(self._status(obj)).label

    def get_is_bookable(self, obj) -> bool:
        return self._status(obj) in ("available", "few_left")


class SessionFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name="city__slug")
    provider = django_filters.ChoiceFilter(choices=Provider.choices)
    category = django_filters.ChoiceFilter(
        choices=[("regular", "Regular"), ("ukvi", "UKVI")], method="filter_category"
    )
    test_type = django_filters.CharFilter(field_name="test_type__code")
    # Not called "format": DRF reserves ?format= for content negotiation.
    test_format = django_filters.ChoiceFilter(field_name="format", choices=TestFormat.choices)
    month = django_filters.CharFilter(method="filter_month", help_text="YYYY-MM")
    hide_closed = django_filters.BooleanFilter(method="filter_hide_closed")

    class Meta:
        model = TestSession
        fields = ["city", "provider", "category", "test_type", "test_format", "month", "hide_closed"]

    def filter_category(self, qs, name, value):
        return qs.filter(test_type__is_ukvi=(value == "ukvi"))

    def filter_month(self, qs, name, value):
        m = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", value or "")
        if not m:
            return qs.none()
        return qs.filter(date__year=int(m.group(1)), date__month=int(m.group(2)))

    def filter_hide_closed(self, qs, name, value):
        if not value:
            return qs
        today = timezone.localdate()
        return qs.filter(Q(registration_closes_on__gte=today) | Q(registration_closes_on__isnull=True))


def session_queryset():
    return TestSession.objects.filter(is_visible=True, date__gte=timezone.localdate()).select_related(
        "city", "venue", "test_type"
    )


class CityListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CitySerializer
    pagination_class = None
    filter_backends: list = []

    def get_queryset(self):
        return City.objects.filter(is_active=True).annotate(
            upcoming_count=Count("sessions", filter=_visible_upcoming(), distinct=True)
        )


class TestTypeListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = TestTypeSerializer
    pagination_class = None
    filter_backends: list = []
    queryset = TestType.objects.filter(is_active=True)


class SessionListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SessionSerializer
    filterset_class = SessionFilter

    def get_queryset(self):
        return session_queryset()


class SessionDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = SessionSerializer
    filter_backends: list = []

    def get_queryset(self):
        return session_queryset()
