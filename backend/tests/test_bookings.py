import re
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import BookingRequest, BookingStatus
from apps.core.models import SiteSettings

pytestmark = pytest.mark.django_db
URL = "/api/v1/bookings/"


def test_requires_login(api, make_session):
    s = make_session()
    assert api.post(URL, {"session": s.pk}, format="json").status_code in (401, 403)
    assert api.get(URL).status_code in (401, 403)


def test_create_booking_and_whatsapp_message(auth_api, make_session, user):
    s = make_session()
    res = auth_api.post(URL, {"session": s.pk}, format="json")
    assert res.status_code == 201
    assert res.data["status"] == BookingStatus.INITIATED
    assert re.fullmatch(r"BYI-\d{4}-\d{6}", res.data["reference"])
    b = BookingRequest.objects.get()
    assert b.user == user and b.whatsapp_clicked_at
    url = urlparse(res.data["whatsapp_url"])
    assert url.netloc == "wa.me" and url.path.strip("/") == SiteSettings.load().whatsapp_number
    text = parse_qs(url.query)["text"][0]
    assert text.startswith("Hi, my name is Sita Sharma. I want to book IELTS.")
    assert "IELTS Academic (Computer-delivered)" in text
    assert "City: Kathmandu" in text and f"Reference: {b.reference}" in text


def test_duplicate_request_reuses_booking(auth_api, make_session):
    s = make_session()
    first = auth_api.post(URL, {"session": s.pk}, format="json")
    second = auth_api.post(URL, {"session": s.pk}, format="json")
    assert second.status_code == 200 and second.data["id"] == first.data["id"]
    assert BookingRequest.objects.count() == 1


def test_cancelled_booking_can_be_rebooked(auth_api, make_session):
    s = make_session()
    first = auth_api.post(URL, {"session": s.pk}, format="json")
    BookingRequest.objects.filter(pk=first.data["id"]).update(status=BookingStatus.CANCELLED)
    assert auth_api.post(URL, {"session": s.pk}, format="json").status_code == 201


@pytest.mark.parametrize("kw", [{"seats_total": 5, "seats_booked": 5}, {"is_visible": False}])
def test_unavailable_sessions_rejected(auth_api, make_session, kw):
    s = make_session(**kw)
    assert auth_api.post(URL, {"session": s.pk}, format="json").status_code == 400


def test_closed_registration_rejected(auth_api, make_session):
    s = make_session(date=timezone.localdate() + timedelta(days=2))
    res = auth_api.post(URL, {"session": s.pk}, format="json")
    assert res.status_code == 400 and "closed" in res.data["detail"]


def test_users_only_see_their_own_bookings(auth_api, make_session, django_user_model):
    s = make_session()
    auth_api.post(URL, {"session": s.pk}, format="json")
    other = django_user_model.objects.create_user("o@example.com", "Str0ng-pass-123", full_name="Other")
    c = APIClient()
    c.force_login(other)
    assert c.get(URL).data == []
    mine = auth_api.get(URL).data
    assert len(mine) == 1
    assert c.post(f"{URL}{mine[0]['id']}/whatsapp/").status_code == 404


def test_resend_whatsapp(auth_api, make_session):
    s = make_session()
    b = auth_api.post(URL, {"session": s.pk}, format="json").data
    res = auth_api.post(f"{URL}{b['id']}/whatsapp/")
    assert res.status_code == 200 and "wa.me" in res.data["whatsapp_url"]
