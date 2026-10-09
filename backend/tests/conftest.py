import os

os.environ.setdefault("DEBUG", "true")

from datetime import timedelta  # noqa: E402

import pytest  # noqa: E402
from django.utils import timezone  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

from apps.accounts.models import User  # noqa: E402
from apps.catalog.models import City, TestSession, TestType  # noqa: E402


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        "student@example.com", "Str0ng-pass-123", full_name="Sita Sharma", phone="9801234567"
    )


JPEG_BYTES = bytes([0xFF, 0xD8, 0xFF, 0xE0])


class PassportClient(APIClient):
    """Booking requests need a passport photo. This client adds a small valid one unless the test sends its own."""

    def post(self, path, data=None, format=None, **extra):
        if path == "/api/v1/bookings/" and isinstance(data, dict) and "passport" not in data:
            from django.core.files.uploadedfile import SimpleUploadedFile

            data = {
                **{k: v for k, v in data.items() if v is not None},
                "passport": SimpleUploadedFile("p.jpg", JPEG_BYTES + b"0" * 40, "image/jpeg"),
            }
            format = "multipart"
        return super().post(path, data, format=format, **extra)


@pytest.fixture
def auth_api(user):
    c = PassportClient()
    c.force_login(user)
    return c


@pytest.fixture
def no_passport_api(user):
    c = APIClient()
    c.force_login(user)
    return c


@pytest.fixture
def ktm(db):
    return City.objects.get(slug="kathmandu")


@pytest.fixture
def academic(db):
    return TestType.objects.get(code="academic")


@pytest.fixture
def make_session(ktm, academic):
    def _make(**kw):
        kw.setdefault("date", timezone.localdate() + timedelta(days=20))
        kw.setdefault("city", ktm)
        kw.setdefault("test_type", academic)
        kw.setdefault("fee_npr", 28000)
        kw.setdefault("seats_total", 10)
        return TestSession.objects.create(**kw)

    return _make
