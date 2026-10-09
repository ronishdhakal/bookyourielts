from datetime import date, timedelta

import pytest
from django.urls import reverse

from apps.bookings.models import BookingRequest, BookingStatus, Inquiry
from apps.catalog.models import City, TestSession, TestType

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(client, django_user_model):
    u = django_user_model.objects.create_superuser("root@example.com", "Str0ng-pass-123", full_name="Root")
    client.force_login(u)
    return client


@pytest.mark.parametrize(
    "name",
    [
        "catalog_testsession",
        "catalog_city",
        "catalog_venue",
        "catalog_testtype",
        "bookings_bookingrequest",
        "bookings_inquiry",
        "core_faq",
        "core_contentblock",
        "accounts_user",
    ],
)
def test_changelists_render(admin_client, make_session, user, name):
    s = make_session()
    BookingRequest.objects.create(user=user, session=s)
    Inquiry.objects.create(name="A", phone="+9779801234567")
    assert admin_client.get(reverse(f"admin:{name}_changelist")).status_code == 200


def test_add_and_change_forms_render(admin_client, make_session, user):
    s = make_session()
    b = BookingRequest.objects.create(user=user, session=s)
    assert admin_client.get(reverse("admin:catalog_testsession_add")).status_code == 200
    assert admin_client.get(reverse("admin:catalog_testsession_change", args=[s.pk])).status_code == 200
    assert admin_client.get(reverse("admin:bookings_bookingrequest_change", args=[b.pk])).status_code == 200


def test_site_settings_redirects_to_single_record(admin_client):
    res = admin_client.get(reverse("admin:core_sitesettings_changelist"), follow=True)
    assert res.status_code == 200 and res.redirect_chain


def test_bulk_create(admin_client, ktm):
    url = "/admin/catalog/testsession/bulk-create/"
    assert admin_client.get(url).status_code == 200
    data = {
        "provider": "british_council",
        "cities": [ktm.pk, City.objects.get(slug="pokhara").pk],
        "test_types": [
            TestType.objects.get(code="academic").pk,
            TestType.objects.get(code="ukvi-academic").pk,
        ],
        "formats": ["computer", "computer_wop"],
        "slots": ["morning"],
        "first_date": (date.today() + timedelta(days=30)).isoformat(),
        "repeat": 2,
        "every_days": 7,
        "fee_npr": 28000,
        "seats_total": 20,
        "is_visible": "on",
    }
    assert admin_client.post(url, data).status_code == 302
    # 2 dates x 2 cities x (academic: 2 formats + ukvi: 1 format) = 12
    assert TestSession.objects.count() == 12
    assert admin_client.post(url, data).status_code == 302
    assert TestSession.objects.count() == 12  # running it again creates no duplicates


def test_confirm_via_admin_action_and_edit_form(admin_client, make_session, user):
    s = make_session(seats_total=2)
    b = BookingRequest.objects.create(user=user, session=s)
    admin_client.post(
        reverse("admin:bookings_bookingrequest_changelist"),
        {"action": "mark_confirmed", "_selected_action": [b.pk]},
    )
    s.refresh_from_db()
    assert s.seats_booked == 1
    change = reverse("admin:bookings_bookingrequest_change", args=[b.pk])
    admin_client.post(
        change, {"status": BookingStatus.CANCELLED, "admin_notes": "refunded", "examinee": "self"}
    )
    s.refresh_from_db()
    b.refresh_from_db()
    assert s.seats_booked == 0 and b.status == BookingStatus.CANCELLED and b.admin_notes == "refunded"


def test_csv_export(admin_client, make_session, user):
    s = make_session()
    b = BookingRequest.objects.create(user=user, session=s)
    res = admin_client.post(
        reverse("admin:bookings_bookingrequest_changelist"),
        {"action": "export_selected", "_selected_action": [b.pk]},
    )
    assert res["Content-Type"].startswith("text/csv") and b.reference in res.content.decode()
