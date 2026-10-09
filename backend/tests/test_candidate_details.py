from datetime import date, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.bookings.models import BookingRequest, BookingStatus

pytestmark = pytest.mark.django_db
URL = "/api/v1/bookings/"
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64
PDF = b"%PDF-1.4 " + b"0" * 64


def details(**kw):
    base = {
        "examinee": "other",
        "candidate_name": "Hari Karki",
        "candidate_phone": "98 0000 1111",
        "candidate_email": "hari@example.com",
        "date_of_birth": "2002-05-14",
        "province": "Bagmati",
        "district": "Lalitpur",
        "municipality": "Godawari",
    }
    base.update(kw)
    return base


def test_details_are_saved_and_used_in_message(auth_api, make_session):
    s = make_session()
    res = auth_api.post(URL, {"session": s.pk, **details()}, format="json")
    assert res.status_code == 201
    b = BookingRequest.objects.get()
    assert b.candidate_phone == "+9779800001111" and b.district == "Lalitpur"
    assert "my name is Hari Karki" in res.data["whatsapp_url"].replace("%20", " ")


def test_passport_upload_stored_privately(auth_api, make_session, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    s = make_session()
    res = auth_api.post(
        URL,
        {
            "session": s.pk,
            **details(),
            "passport": SimpleUploadedFile("front.jpg", JPEG, "image/jpeg"),
        },
        format="multipart",
    )
    assert res.status_code == 201 and res.data["has_passport"] is True
    assert "passport" not in res.data  # file locations are never exposed to the student API
    b = BookingRequest.objects.get()
    assert b.passport.name.startswith("passports/") and "front" not in b.passport.name


@pytest.mark.parametrize("case", ["exe", "fake_jpg", "png_with_jpeg_bytes", "too_big"])
def test_bad_uploads_rejected(auth_api, make_session, settings, tmp_path, case):
    settings.MEDIA_ROOT = tmp_path
    name, content = {
        "exe": ("x.exe", JPEG),
        "fake_jpg": ("x.jpg", b"not an image at all"),
        "png_with_jpeg_bytes": ("x.png", JPEG),
        "too_big": ("x.jpg", JPEG + b"0" * (10 * 1024 * 1024)),
    }[case]
    s = make_session()
    res = auth_api.post(
        URL, {"session": s.pk, "passport": SimpleUploadedFile(name, content)}, format="multipart"
    )
    assert res.status_code == 400 and "passport" in res.data


@pytest.mark.parametrize(
    "bad",
    [
        {"date_of_birth": (date.today() + timedelta(days=1)).isoformat()},
        {"date_of_birth": (date.today() - timedelta(days=365 * 10)).isoformat()},
        {"candidate_phone": "12345"},
        {"province": "Atlantis"},
        {"district": "Kaski"},  # exists, but not in Bagmati
        {"district": "Nowhere"},
    ],
)
def test_invalid_details_rejected(auth_api, make_session, bad):
    s = make_session()
    assert auth_api.post(URL, {"session": s.pk, **details(**bad)}, format="json").status_code == 400


def test_resubmitting_updates_the_same_request(auth_api, make_session):
    s = make_session()
    first = auth_api.post(URL, {"session": s.pk, **details()}, format="json")
    second = auth_api.post(URL, {"session": s.pk, **details(candidate_name="Hari B. Karki")}, format="json")
    assert second.status_code == 200 and second.data["id"] == first.data["id"]
    assert BookingRequest.objects.get().candidate_name == "Hari B. Karki"


def test_detail_and_cancel(auth_api, make_session, django_user_model):
    s = make_session()
    b = auth_api.post(URL, {"session": s.pk}, format="json").data
    assert auth_api.get(f"{URL}{b['id']}/").data["reference"] == b["reference"]
    other = APIClient()
    other.force_login(
        django_user_model.objects.create_user("z@example.com", "Str0ng-pass-123", full_name="Z")
    )
    assert other.get(f"{URL}{b['id']}/").status_code == 404
    assert other.post(f"{URL}{b['id']}/cancel/").status_code == 404
    res = auth_api.post(f"{URL}{b['id']}/cancel/")
    assert res.status_code == 200 and res.data["status"] == BookingStatus.CANCELLED
    again = auth_api.post(f"{URL}{b['id']}/cancel/")
    assert again.status_code == 400


def test_confirmed_booking_cannot_be_withdrawn_by_student(auth_api, make_session):
    from apps.bookings import services

    s = make_session()
    b = auth_api.post(URL, {"session": s.pk}, format="json").data
    services.set_booking_status(b["id"], BookingStatus.CONFIRMED)
    assert auth_api.post(f"{URL}{b['id']}/cancel/").status_code == 400


def test_regions_endpoint(api):
    data = api.get("/api/v1/regions/").data["provinces"]
    assert len(data) == 7 and sum(len(v) for v in data.values()) == 77


def test_provider_and_category_filters(api, make_session):
    from apps.catalog.models import TestType

    make_session(provider="idp")
    make_session(test_type=TestType.objects.get(code="ukvi-academic"))
    S = "/api/v1/sessions/"
    assert api.get(S, {"provider": "idp"}).data["count"] == 1
    assert api.get(S, {"category": "ukvi"}).data["count"] == 1
    assert api.get(S, {"category": "regular"}).data["count"] == 1


def test_passport_only_visible_to_staff_through_admin(
    auth_api, make_session, settings, tmp_path, client, django_user_model
):
    settings.MEDIA_ROOT = tmp_path
    s = make_session()
    auth_api.post(
        URL,
        {"session": s.pk, "passport": SimpleUploadedFile("a.jpg", JPEG, "image/jpeg")},
        format="multipart",
    )
    b = BookingRequest.objects.get()
    url = reverse("admin:bookings_bookingrequest_passport", args=[b.pk])
    assert client.get(url).status_code == 302  # anonymous: sent to admin login
    staff = django_user_model.objects.create_superuser("root@example.com", "Str0ng-pass-123", full_name="R")
    client.force_login(staff)
    res = client.get(url)
    assert res.status_code == 200 and "no-store" in res["Cache-Control"] and "private" in res["Cache-Control"]


def test_a_passport_photo_is_required(no_passport_api, make_session):
    s = make_session()
    res = no_passport_api.post(URL, {"session": s.pk, **details()}, format="json")
    assert res.status_code == 400 and "passport" in res.data
    assert not BookingRequest.objects.exists()
