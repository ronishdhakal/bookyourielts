from urllib.parse import parse_qs, urlparse

import pytest
from django.core.cache import cache

from apps.bookings.models import Inquiry

pytestmark = pytest.mark.django_db
URL = "/api/v1/inquiries/"
GOOD = {
    "name": "Ram Thapa",
    "phone": "98 0123 4567",
    "preferred_city": "pokhara",
    "test_type": "academic",
    "preferred_month": "2026-12",
}


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


def test_guest_can_inquire_and_gets_whatsapp_link(api):
    res = api.post(URL, GOOD, format="json")
    assert res.status_code == 201
    i = Inquiry.objects.get()
    assert i.phone == "+9779801234567" and i.user is None and i.status == "new"
    text = parse_qs(urlparse(res.data["whatsapp_url"]).query)["text"][0]
    assert text.startswith(
        "Hi, my name is Ram Thapa. I want to book IELTS but I can't see dates for Pokhara/IELTS Academic."
    )


def test_logged_in_inquiry_is_linked_and_listed(auth_api, user):
    auth_api.post(URL, GOOD, format="json")
    assert Inquiry.objects.get().user == user
    assert len(auth_api.get(URL + "mine/").data) == 1


def test_invalid_phone_rejected(api):
    res = api.post(URL, {**GOOD, "phone": "12345"}, format="json")
    assert res.status_code == 400 and "phone" in res.data


def test_bad_month_and_city_rejected(api):
    assert api.post(URL, {**GOOD, "preferred_month": "Dec"}, format="json").status_code == 400
    assert api.post(URL, {**GOOD, "preferred_city": "mars"}, format="json").status_code == 400


def test_minimal_inquiry_ok(api):
    assert api.post(URL, {"name": "A", "phone": "9801234567"}, format="json").status_code == 201


def test_rate_limited(api):
    codes = [api.post(URL, GOOD, format="json").status_code for _ in range(7)]
    assert codes[:5] == [201] * 5 and 429 in codes[5:]


def test_general_question_uses_the_general_whatsapp_text(api):
    res = api.post(
        URL, {"name": "Sita", "phone": "9801234567", "message": "Do you help with visas?"}, format="json"
    )
    assert res.status_code == 201
    text = parse_qs(urlparse(res.data["whatsapp_url"]).query)["text"][0]
    assert text == "Hi, my name is Sita. I have a question about IELTS booking. Do you help with visas?"
