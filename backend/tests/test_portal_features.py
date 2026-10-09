from datetime import date, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import BookingRequest, Candidate, DateAlert
from apps.catalog.models import City, TestType

pytestmark = pytest.mark.django_db
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64
PERSON = {
    "full_name": "Maya Gurung",
    "relation": "Daughter",
    "phone": "98 0000 2222",
    "date_of_birth": "2004-03-09",
    "province": "Gandaki",
    "district": "Kaski",
    "municipality": "Pokhara",
}


def other_client(django_user_model, email="other@example.com"):
    c = APIClient()
    c.force_login(django_user_model.objects.create_user(email, "Str0ng-pass-123", full_name="Other"))
    return c


# ---------------------------------------------------------------- candidates
def test_candidate_crud_and_isolation(auth_api, django_user_model):
    res = auth_api.post("/api/v1/candidates/", PERSON, format="json")
    assert res.status_code == 201 and res.data["phone"] == "+9779800002222"
    cid = res.data["id"]
    assert len(auth_api.get("/api/v1/candidates/").data) == 1
    assert (
        auth_api.patch(f"/api/v1/candidates/{cid}/", {"relation": "Sister"}, format="json").data["relation"]
        == "Sister"
    )
    stranger = other_client(django_user_model)
    assert stranger.get("/api/v1/candidates/").data == []
    assert stranger.get(f"/api/v1/candidates/{cid}/").status_code == 404
    assert stranger.delete(f"/api/v1/candidates/{cid}/").status_code == 404
    assert auth_api.delete(f"/api/v1/candidates/{cid}/").status_code == 204


@pytest.mark.parametrize(
    "bad",
    [
        {"date_of_birth": (date.today() - timedelta(days=365 * 5)).isoformat()},
        {"phone": "123"},
        {"district": "Kathmandu"},
        {"province": "Atlantis"},
    ],
)
def test_candidate_validation(auth_api, bad):
    assert auth_api.post("/api/v1/candidates/", {**PERSON, **bad}, format="json").status_code == 400


def test_candidate_limit(auth_api, user):
    Candidate.objects.bulk_create([Candidate(user=user, full_name=f"P{i}") for i in range(20)])
    res = auth_api.post("/api/v1/candidates/", PERSON, format="json")
    assert res.status_code == 400 and "up to 20" in res.data["detail"]


def test_booking_with_saved_candidate_fills_details_and_passport(
    auth_api, make_session, user, settings, tmp_path
):
    settings.MEDIA_ROOT = tmp_path
    cand = Candidate.objects.create(
        user=user, **{k: v for k, v in PERSON.items() if k != "phone"}, phone="+9779800002222"
    )
    cand.passport = SimpleUploadedFile("p.jpg", JPEG, "image/jpeg")
    cand.save()
    s = make_session()
    res = auth_api.post(
        "/api/v1/bookings/", {"session": s.pk, "candidate": cand.pk, "examinee": "other"}, format="json"
    )
    assert res.status_code == 201
    b = BookingRequest.objects.get()
    assert b.candidate_id == cand.pk and b.candidate_name == "Maya Gurung" and b.district == "Kaski"
    assert b.passport and res.data["has_passport"] is True
    assert "my name is Maya Gurung" in res.data["whatsapp_url"].replace("%20", " ")


def test_booking_cannot_use_someone_elses_candidate(auth_api, make_session, django_user_model):
    stranger = other_client(django_user_model)
    cid = stranger.post("/api/v1/candidates/", PERSON, format="json").data["id"]
    s = make_session()
    res = auth_api.post("/api/v1/bookings/", {"session": s.pk, "candidate": cid}, format="json")
    assert res.status_code == 400 and "candidate" in res.data


def test_save_candidate_flag_creates_and_reuses_one(auth_api, make_session):
    s1, s2 = make_session(), make_session(date=timezone.localdate() + timedelta(days=30))
    body = {
        "examinee": "other",
        "candidate_name": "Ram Thapa",
        "candidate_phone": "9801112233",
        "date_of_birth": "2003-01-02",
        "province": "Bagmati",
        "district": "Lalitpur",
        "municipality": "Godawari",
        "save_candidate": True,
        "relation": "Client",
    }
    auth_api.post("/api/v1/bookings/", {"session": s1.pk, **body}, format="json")
    auth_api.post("/api/v1/bookings/", {"session": s2.pk, **body}, format="json")
    assert Candidate.objects.count() == 1
    assert Candidate.objects.get().relation == "Client"
    assert BookingRequest.objects.filter(candidate__isnull=False).count() == 2


# ---------------------------------------------------------------- documents and change requests
def test_passport_can_be_added_after_booking(auth_api, make_session, settings, tmp_path, django_user_model):
    settings.MEDIA_ROOT = tmp_path
    s = make_session()
    b = auth_api.post("/api/v1/bookings/", {"session": s.pk}, format="json").data
    assert b["has_passport"] is True  # it is required to book; this replaces it
    url = f"/api/v1/bookings/{b['id']}/documents/"
    res = auth_api.post(
        url, {"passport": SimpleUploadedFile("a.jpg", JPEG, "image/jpeg")}, format="multipart"
    )
    assert res.status_code == 200 and res.data["has_passport"] is True
    assert auth_api.post(url, {}, format="multipart").status_code == 400
    bad = auth_api.post(url, {"passport": SimpleUploadedFile("a.exe", JPEG)}, format="multipart")
    assert bad.status_code == 400 and "passport" in bad.data
    assert (
        other_client(django_user_model)
        .post(url, {"passport": SimpleUploadedFile("a.jpg", JPEG)}, format="multipart")
        .status_code
        == 404
    )


def test_change_request_flow_with_staff_resolution(auth_api, make_session, django_user_model):
    s = make_session()
    b = auth_api.post("/api/v1/bookings/", {"session": s.pk}, format="json").data
    url = f"/api/v1/bookings/{b['id']}/change-request/"
    assert auth_api.post(url, {"message": "hi"}, format="json").status_code == 400  # too short
    res = auth_api.post(url, {"message": "Please move me to the next week."}, format="json")
    assert res.status_code == 200 and res.data["change_open"] is True

    staff = APIClient()
    staff.force_login(
        django_user_model.objects.create_user(
            "st@example.com", "Str0ng-pass-123", full_name="S", is_staff=True
        )
    )
    assert staff.get("/api/v1/manage/bookings/", {"change": "open"}).data["count"] == 1
    assert staff.get("/api/v1/manage/stats/").data["change_requests"] == 1
    done = staff.patch(f"/api/v1/manage/bookings/{b['id']}/", {"resolve_change": True}, format="json")
    assert done.data["change_open"] is False
    assert staff.get("/api/v1/manage/bookings/", {"change": "open"}).data["count"] == 0
    # A new request after resolution opens it again.
    assert (
        auth_api.post(url, {"message": "One more change please."}, format="json").data["change_open"] is True
    )


def test_cancelled_booking_rejects_change_requests(auth_api, make_session):
    s = make_session()
    b = auth_api.post("/api/v1/bookings/", {"session": s.pk}, format="json").data
    auth_api.post(f"/api/v1/bookings/{b['id']}/cancel/")
    assert (
        auth_api.post(
            f"/api/v1/bookings/{b['id']}/change-request/", {"message": "Change please"}, format="json"
        ).status_code
        == 400
    )


# ---------------------------------------------------------------- alerts
def test_alert_matches_and_new_matches(auth_api, make_session, user):
    pokhara = City.objects.get(slug="pokhara")
    make_session(city=pokhara)
    res = auth_api.post("/api/v1/alerts/", {"city": "pokhara", "test_type": "academic"}, format="json")
    assert res.status_code == 201
    a = res.data
    assert a["matches"] == 1 and a["new_matches"] == 0 and a["next_date"]
    make_session(city=pokhara, date=timezone.localdate() + timedelta(days=40))
    make_session()  # Kathmandu, not a match
    listed = auth_api.get("/api/v1/alerts/").data[0]
    assert listed["matches"] == 2 and listed["new_matches"] == 1
    assert auth_api.post(f"/api/v1/alerts/{a['id']}/seen/").data["new_matches"] == 0


def test_alert_ignores_full_hidden_and_closed_dates(auth_api, make_session):
    make_session(seats_total=3, seats_booked=3)
    make_session(is_visible=False)
    make_session(date=timezone.localdate() + timedelta(days=2))  # registration already closed
    a = auth_api.post("/api/v1/alerts/", {}, format="json").data
    assert a["matches"] == 0 and a["next_date"] is None


def test_alert_filters(auth_api, make_session):
    make_session(provider="idp")
    ukvi = TestType.objects.get(code="ukvi-academic")
    make_session(test_type=ukvi)
    post = lambda body: auth_api.post("/api/v1/alerts/", body, format="json").data["matches"]  # noqa: E731
    assert post({"provider": "idp"}) == 1
    assert post({"category": "ukvi"}) == 1
    assert post({"category": "regular"}) == 1
    assert post({"test_format": "computer_wop"}) == 0


def test_alert_limits_validation_and_isolation(auth_api, user, django_user_model):
    assert auth_api.post("/api/v1/alerts/", {"month": "Dec"}, format="json").status_code == 400
    assert auth_api.post("/api/v1/alerts/", {"city": "mars"}, format="json").status_code == 400
    DateAlert.objects.bulk_create([DateAlert(user=user) for _ in range(10)])
    assert auth_api.post("/api/v1/alerts/", {}, format="json").status_code == 400
    stranger = other_client(django_user_model)
    aid = DateAlert.objects.first().pk
    assert stranger.get("/api/v1/alerts/").data == []
    assert stranger.patch(f"/api/v1/alerts/{aid}/", {"is_active": False}, format="json").status_code == 404
    assert auth_api.patch(f"/api/v1/alerts/{aid}/", {"is_active": False}, format="json").status_code == 200
    assert auth_api.delete(f"/api/v1/alerts/{aid}/").status_code == 204


def test_staff_stats_show_unmet_alert_demand(auth_api, make_session, django_user_model):
    make_session()
    auth_api.post("/api/v1/alerts/", {"city": "kathmandu"}, format="json")
    auth_api.post("/api/v1/alerts/", {"city": "butwal"}, format="json")  # nothing there
    staff = APIClient()
    staff.force_login(
        django_user_model.objects.create_user(
            "st@example.com", "Str0ng-pass-123", full_name="S", is_staff=True
        )
    )
    assert staff.get("/api/v1/manage/stats/").data["alerts"] == {"active": 2, "unmatched": 1}


def test_portal_endpoints_need_login(api):
    for path in ("candidates/", "alerts/"):
        assert api.get(f"/api/v1/{path}").status_code in (401, 403)
