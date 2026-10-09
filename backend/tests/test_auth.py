import re

import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db
P = "/api/v1/auth/"
REG = {
    "email": "New@Example.com",
    "password": "Str0ng-pass-123",
    "full_name": "New Student",
    "phone": "+977 9812345678",
}


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()


def test_register_logs_in_normalises_and_sends_verification(api):
    res = api.post(P + "register/", REG, format="json")
    assert res.status_code == 201
    assert res.data["email"] == "new@example.com" and res.data["phone"] == "+9779812345678"
    assert res.data["email_verified"] is False
    assert api.get(P + "me/").status_code == 200
    assert len(mail.outbox) == 1


def test_register_validation(api):
    assert api.post(P + "register/", {**REG, "password": "123"}, format="json").status_code == 400
    assert api.post(P + "register/", {**REG, "phone": "555"}, format="json").status_code == 400
    api.post(P + "register/", REG, format="json")
    dup = api.post(P + "register/", {**REG, "email": "new@example.com"}, format="json")
    assert dup.status_code == 400 and "email" in dup.data


def test_login_logout(api, user):
    assert (
        api.post(P + "login/", {"email": "student@example.com", "password": "bad"}, format="json").status_code
        == 400
    )
    ok = api.post(
        P + "login/", {"email": "STUDENT@example.com", "password": "Str0ng-pass-123"}, format="json"
    )
    assert ok.status_code == 200
    assert api.get(P + "me/").data["full_name"] == "Sita Sharma"
    api.post(P + "logout/")
    assert api.get(P + "me/").data == {"authenticated": False}


def test_login_requires_csrf_token(user):
    c = APIClient(enforce_csrf_checks=True)
    body = {"email": "student@example.com", "password": "Str0ng-pass-123"}
    assert c.post(P + "login/", body, format="json").status_code == 403
    token = c.get("/api/v1/csrf/").data["csrfToken"]
    assert c.post(P + "login/", body, format="json", HTTP_X_CSRFTOKEN=token).status_code == 200


def test_login_is_rate_limited(api, user):
    body = {"email": "x@example.com", "password": "nope"}
    codes = [api.post(P + "login/", body, format="json").status_code for _ in range(12)]
    assert 429 in codes


def test_email_verification_flow(api):
    api.post(P + "register/", REG, format="json")
    token = re.search(r"token=(\S+)", mail.outbox[0].body).group(1)
    assert api.post(P + "verify-email/", {"token": "junk"}, format="json").status_code == 400
    assert api.post(P + "verify-email/", {"token": token}, format="json").status_code == 200
    assert api.get(P + "me/").data["email_verified"] is True


def test_password_reset_flow(api, user):
    assert api.post(P + "password-reset/", {"email": "nobody@example.com"}, format="json").status_code == 200
    assert len(mail.outbox) == 0  # no email sent, but the response is identical
    api.post(P + "password-reset/", {"email": user.email}, format="json")
    m = re.search(r"uid=([^&]+)&token=(\S+)", mail.outbox[0].body)
    body = {"uid": m.group(1), "token": m.group(2), "password": "An0ther-pass-456"}
    assert (
        api.post(P + "password-reset/confirm/", {**body, "password": "123"}, format="json").status_code == 400
    )
    assert api.post(P + "password-reset/confirm/", body, format="json").status_code == 200
    user.refresh_from_db()
    assert user.check_password("An0ther-pass-456")
    assert api.post(P + "password-reset/confirm/", body, format="json").status_code == 400  # single use


def test_post_without_trailing_slash_is_not_redirected(api):
    res = api.post("/api/v1/auth/register", REG, format="json")
    assert res.status_code == 201
