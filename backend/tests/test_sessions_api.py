from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import City, SeatStatus, TestFormat, TestType
from apps.core.models import SiteSettings

URL = "/api/v1/sessions/"
pytestmark = pytest.mark.django_db


def today():
    return timezone.localdate()


def test_defaults_filled_in(make_session):
    s = make_session(date=today() + timedelta(days=30))
    assert s.registration_closes_on == s.date - timedelta(days=6)
    assert s.results_date == s.date + timedelta(days=5)
    w = make_session(date=today() + timedelta(days=30), format=TestFormat.COMPUTER_WOP)
    assert w.results_date == w.date + timedelta(days=13)


def test_lists_only_visible_upcoming(api, make_session):
    make_session()
    make_session(is_visible=False)
    make_session(date=today() - timedelta(days=2))
    res = api.get(URL)
    assert res.status_code == 200
    assert res.data["count"] == 1


@pytest.mark.parametrize(
    "booked,total,expected",
    [
        (0, 20, SeatStatus.AVAILABLE),
        (14, 20, SeatStatus.AVAILABLE),
        (15, 20, SeatStatus.FEW),
        (20, 20, SeatStatus.FULL),
    ],
)
def test_seat_status(api, make_session, booked, total, expected):
    make_session(seats_total=total, seats_booked=booked)
    assert api.get(URL).data["results"][0]["seat_status"] == expected


def test_threshold_is_configurable(api, make_session):
    make_session(seats_total=20, seats_booked=10)
    cfg = SiteSettings.load()
    cfg.low_seat_threshold = 10
    cfg.save()
    assert api.get(URL).data["results"][0]["seat_status"] == SeatStatus.FEW


def test_registration_closed_logic(api, make_session):
    make_session(date=today() + timedelta(days=3))  # closed 3 days ago by default
    make_session(date=today() + timedelta(days=6))  # closes today, still open
    rows = {r["registration_closes_on"]: r for r in api.get(URL).data["results"]}
    closed = rows[str(today() - timedelta(days=3))]
    open_today = rows[str(today())]
    assert closed["seat_status"] == SeatStatus.CLOSED and not closed["is_bookable"]
    assert open_today["is_bookable"]
    assert api.get(URL, {"hide_closed": "true"}).data["count"] == 1


def test_filters(api, make_session):
    pokhara = City.objects.get(slug="pokhara")
    gt = TestType.objects.get(code="general-training")
    make_session(date=today() + timedelta(days=40))
    make_session(
        city=pokhara, test_type=gt, format=TestFormat.COMPUTER_WOP, date=today() + timedelta(days=70)
    )
    assert api.get(URL, {"city": "pokhara"}).data["count"] == 1
    assert api.get(URL, {"test_type": "general-training"}).data["count"] == 1
    assert api.get(URL, {"test_format": "computer_wop"}).data["count"] == 1
    month = (today() + timedelta(days=70)).strftime("%Y-%m")
    rows = api.get(URL, {"month": month}).data["results"]
    assert rows and all(r["date"].startswith(month) for r in rows)
    assert api.get(URL, {"month": "garbage"}).data["count"] == 0


def test_session_detail(api, make_session):
    s = make_session()
    res = api.get(f"{URL}{s.pk}/")
    assert res.status_code == 200 and res.data["city"]["slug"] == "kathmandu"
    hidden = make_session(is_visible=False)
    assert api.get(f"{URL}{hidden.pk}/").status_code == 404


def test_ukvi_cannot_use_writing_on_paper(make_session):
    from django.core.exceptions import ValidationError

    ukvi = TestType.objects.get(code="ukvi-academic")
    s = make_session(test_type=ukvi)
    s.format = TestFormat.COMPUTER_WOP
    with pytest.raises(ValidationError):
        s.full_clean()


def test_cannot_overbook_at_db_level(make_session):
    from django.db import IntegrityError, transaction

    s = make_session(seats_total=2)
    s.seats_booked = 3
    with pytest.raises(IntegrityError), transaction.atomic():
        s.save()


def test_list_query_count_is_flat(api, make_session, django_assert_max_num_queries):
    for i in range(10):
        make_session(date=today() + timedelta(days=20 + i))
    with django_assert_max_num_queries(6):
        api.get(URL)


def test_api_works_without_trailing_slash(api, make_session):
    make_session()
    res = api.get("/api/v1/sessions")
    assert res.status_code == 200 and res.data["count"] == 1


def test_session_exposes_updated_at(api, make_session):
    make_session()
    res = api.get(URL)
    assert res.data["results"][0]["updated_at"]
