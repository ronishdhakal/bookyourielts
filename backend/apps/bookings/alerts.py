"""Date alerts: saved searches matched against the open test dates."""

from django.db.models import F, QuerySet
from django.utils import timezone

from apps.catalog.models import TestSession

from .models import DateAlert


def matching_sessions(alert: DateAlert) -> QuerySet[TestSession]:
    """Dates a student could book right now that fit the alert."""
    today = timezone.localdate()
    qs = TestSession.objects.filter(
        is_visible=True,
        date__gte=today,
        registration_closes_on__gte=today,
        seats_booked__lt=F("seats_total"),
    )
    if alert.provider:
        qs = qs.filter(provider=alert.provider)
    if alert.category:
        qs = qs.filter(test_type__is_ukvi=(alert.category == "ukvi"))
    if alert.test_type_id:
        qs = qs.filter(test_type_id=alert.test_type_id)
    if alert.test_format:
        qs = qs.filter(format=alert.test_format)
    if alert.city_id:
        qs = qs.filter(city_id=alert.city_id)
    if alert.month:
        year, month = alert.month.split("-")
        qs = qs.filter(date__year=int(year), date__month=int(month))
    return qs


def alert_stats(alert: DateAlert) -> dict:
    qs = matching_sessions(alert)
    since = alert.last_seen_at or alert.created_at
    nxt = qs.order_by("date").values_list("date", flat=True).first()
    return {
        "matches": qs.count(),
        "new_matches": qs.filter(created_at__gt=since).count(),
        "next_date": nxt,
    }
