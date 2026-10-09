from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings import services
from apps.bookings.models import BookingRequest, BookingStatus, Inquiry
from apps.catalog.models import City, TestType
from apps.core.models import SiteSettings

pytestmark = pytest.mark.django_db
M = "/api/v1/manage/"


@pytest.fixture
def staff(django_user_model):
    u = django_user_model.objects.create_user(
        "staff@example.com", "Str0ng-pass-123", full_name="Staff", is_staff=True
    )
    c = APIClient()
    c.force_login(u)
    return c


@pytest.mark.parametrize(
    "path",
    [
        "stats/",
        "meta/",
        "settings/",
        "bookings/",
        "inquiries/",
        "sessions/",
        "sessions/1/",
        "bookings/1/passport/front/",
    ],
)
def test_only_staff_can_use_the_manage_api(api, auth_api, staff, path):
    assert api.get(M + path).status_code in (401, 403)
    assert auth_api.get(M + path).status_code == 403  # a normal student
    assert staff.get(M + path).status_code in (200, 404)


def test_stats_shape_and_numbers(staff, auth_api, make_session, user):
    s = make_session(seats_total=10, seats_booked=0)
    b = BookingRequest.objects.create(user=user, session=s)
    BookingRequest.objects.create(user=user, session=make_session(), status=BookingStatus.CANCELLED)
    services.set_booking_status(b.pk, BookingStatus.CONFIRMED)
    data = staff.get(M + "stats/").data
    assert data["bookings"] == {"initiated": 0, "confirmed": 1, "cancelled": 1, "total": 2}
    assert data["seats_next_30_days"]["booked"] == 1
    assert len(data["per_day"]) == 14 and data["per_day"][-1]["count"] == 2
    assert data["recent_bookings"][0]["reference"].startswith("BYI-")
    assert data["open_dates"] == 2


def test_low_seat_dates_listed(staff, make_session):
    make_session(seats_total=8, seats_booked=6)
    make_session(seats_total=50, seats_booked=0)
    assert len(staff.get(M + "stats/").data["low_seat_dates"]) == 1


def test_booking_list_filters_and_search(staff, make_session, user, django_user_model):
    s = make_session()
    other = django_user_model.objects.create_user("o@example.com", "Str0ng-pass-123", full_name="Maya Gurung")
    BookingRequest.objects.create(user=user, session=s, candidate_name="Hari Karki")
    done = BookingRequest.objects.create(user=other, session=s)
    services.set_booking_status(done.pk, BookingStatus.CONFIRMED)
    assert staff.get(M + "bookings/").data["count"] == 2
    assert staff.get(M + "bookings/", {"status": "confirmed"}).data["count"] == 1
    assert staff.get(M + "bookings/", {"q": "hari"}).data["count"] == 1
    assert staff.get(M + "bookings/", {"q": "maya"}).data["count"] == 1
    assert staff.get(M + "bookings/", {"q": done.reference}).data["count"] == 1
    assert staff.get(M + "bookings/", {"provider": "idp"}).data["count"] == 0


def test_staff_status_change_keeps_seats_correct(staff, make_session, user):
    s = make_session(seats_total=1)
    b = BookingRequest.objects.create(user=user, session=s)
    url = f"{M}bookings/{b.pk}/"
    res = staff.patch(url, {"status": "confirmed", "admin_notes": "paid in cash"}, format="json")
    assert (
        res.status_code == 200
        and res.data["status"] == "confirmed"
        and res.data["admin_notes"] == "paid in cash"
    )
    s.refresh_from_db()
    assert s.seats_booked == 1
    assert staff.patch(url, {"status": "cancelled"}, format="json").status_code == 200
    s.refresh_from_db()
    assert s.seats_booked == 0
    assert staff.patch(url, {"status": "bogus"}, format="json").status_code == 400


def test_staff_cannot_overbook(staff, make_session, user, django_user_model):
    s = make_session(seats_total=1)
    a = BookingRequest.objects.create(user=user, session=s)
    b = BookingRequest.objects.create(
        user=django_user_model.objects.create_user("b@example.com", "Str0ng-pass-123", full_name="B"),
        session=s,
    )
    assert staff.patch(f"{M}bookings/{a.pk}/", {"status": "confirmed"}, format="json").status_code == 200
    res = staff.patch(f"{M}bookings/{b.pk}/", {"status": "confirmed"}, format="json")
    assert res.status_code == 400 and "No seats left" in res.data["detail"]


def test_passport_download_is_staff_only(staff, auth_api, make_session, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    s = make_session()
    auth_api.post(
        "/api/v1/bookings/",
        {
            "session": s.pk,
            "passport_front": SimpleUploadedFile("a.jpg", b"\xff\xd8\xff\xe0" + b"0" * 40, "image/jpeg"),
        },
        format="multipart",
    )
    b = BookingRequest.objects.get()
    detail = staff.get(f"{M}bookings/{b.pk}/").data
    assert detail["has_passport_front"] is True and detail["has_passport_back"] is False
    assert staff.get(f"{M}bookings/{b.pk}/passport/front/").status_code == 200
    assert staff.get(f"{M}bookings/{b.pk}/passport/back/").status_code == 404
    assert auth_api.get(f"{M}bookings/{b.pk}/passport/front/").status_code == 403


def test_inquiries_list_and_update(staff):
    i = Inquiry.objects.create(
        name="Sita", phone="+9779801234567", preferred_city=City.objects.get(slug="pokhara")
    )
    assert staff.get(M + "inquiries/", {"status": "new"}).data["count"] == 1
    assert staff.get(M + "inquiries/", {"q": "sita"}).data["count"] == 1
    res = staff.patch(
        f"{M}inquiries/{i.pk}/", {"status": "contacted", "admin_notes": "called"}, format="json"
    )
    assert (
        res.status_code == 200
        and res.data["status"] == "contacted"
        and res.data["preferred_city_name"] == "Pokhara"
    )
    assert staff.get(M + "inquiries/", {"status": "new"}).data["count"] == 0


def _payload(ktm, academic, **kw):
    base = {
        "date": str(timezone.localdate() + timedelta(days=30)),
        "provider": "british_council",
        "slot": "morning",
        "city": ktm.pk,
        "test_type": academic.pk,
        "format": "computer",
        "fee_npr": 28000,
        "seats_total": 20,
        "is_visible": True,
    }
    base.update(kw)
    return base


def test_create_edit_hide_delete_a_date(staff, ktm, academic):
    res = staff.post(M + "sessions/", _payload(ktm, academic), format="json")
    assert res.status_code == 201
    sid = res.data["id"]
    assert res.data["registration_closes_on"] and res.data["results_date"]  # filled in automatically
    assert (
        staff.patch(f"{M}sessions/{sid}/", {"is_visible": False, "fee_npr": 29000}, format="json").status_code
        == 200
    )
    assert staff.get(M + "sessions/", {"visible": "false"}).data["count"] == 1
    assert staff.delete(f"{M}sessions/{sid}/").status_code == 204


def test_date_rules(staff, ktm, academic):
    ukvi = TestType.objects.get(code="ukvi-academic")
    res = staff.post(M + "sessions/", _payload(ktm, ukvi, format="computer_wop"), format="json")
    assert res.status_code == 400 and "format" in res.data
    pokhara_venue = City.objects.get(slug="pokhara").venues.create(name="P centre")
    res = staff.post(M + "sessions/", _payload(ktm, academic, venue=pokhara_venue.pk), format="json")
    assert res.status_code == 400 and "venue" in res.data


def test_cannot_delete_date_with_bookings_or_shrink_below_confirmed(staff, make_session, user):
    s = make_session(seats_total=5)
    b = BookingRequest.objects.create(user=user, session=s)
    services.set_booking_status(b.pk, BookingStatus.CONFIRMED)
    assert staff.delete(f"{M}sessions/{s.pk}/").status_code == 400
    res = staff.patch(f"{M}sessions/{s.pk}/", {"seats_total": 0}, format="json")
    assert res.status_code == 400 and "seats_total" in res.data
    assert staff.patch(f"{M}sessions/{s.pk}/", {"seats_total": 3}, format="json").status_code == 200


def test_settings_update(staff):
    res = staff.patch(
        M + "settings/", {"whatsapp_number": "9779811111111", "low_seat_threshold": 8}, format="json"
    )
    assert res.status_code == 200
    cfg = SiteSettings.load()
    assert cfg.whatsapp_number == "9779811111111" and cfg.low_seat_threshold == 8
    assert staff.patch(M + "settings/", {"whatsapp_number": "+977 98"}, format="json").status_code == 400


def test_meta_has_form_choices(staff):
    data = staff.get(M + "meta/").data
    assert any(c["name"] == "Kathmandu" for c in data["cities"])
    assert {p["value"] for p in data["providers"]} == {"british_council", "idp"}


def test_logout_clears_a_stale_session_without_csrf(api):
    assert api.post("/api/v1/auth/logout/").status_code == 204
