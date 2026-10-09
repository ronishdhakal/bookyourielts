import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.bookings import services
from apps.bookings.models import BookingStatus, Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def student():
    return User.objects.create_user("sita@example.com", "Str0ng-pass-123", full_name="Sita Rai")


@pytest.fixture
def staff():
    return User.objects.create_user("staff@example.com", "Str0ng-pass-123", full_name="Staff", is_staff=True)


@pytest.fixture
def booking(student, make_session):
    session = make_session()
    b, _ = services.create_booking(student, session.pk, {})
    return b


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def test_request_creates_a_received_notification(student, booking):
    n = Notification.objects.get(user=student)
    assert n.kind == "received" and booking.reference in n.title and n.read_at is None


def test_confirming_notifies_the_student_in_portal_and_by_email(
    student, staff, booking, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        res = client_for(staff).patch(
            f"/api/v1/manage/bookings/{booking.pk}/", {"status": "confirmed"}, format="json"
        )
    assert res.status_code == 200
    n = Notification.objects.get(user=student, kind="confirmed")
    assert "confirmed" in n.title and n.emailed_at is not None
    assert len([m for m in mail.outbox if m.to == [student.email] and "confirmed" in m.subject]) == 1


def test_email_can_be_switched_off(student, staff, booking, django_capture_on_commit_callbacks):
    student.email_notifications = False
    student.save()
    with django_capture_on_commit_callbacks(execute=True):
        services.set_booking_status(booking.pk, BookingStatus.CONFIRMED)
    assert Notification.objects.filter(user=student, kind="confirmed").exists()
    assert mail.outbox == []


def test_a_broken_mail_server_never_blocks_the_booking(
    student, booking, settings, django_capture_on_commit_callbacks
):
    settings.EMAIL_BACKEND = "tests.test_notifications.BrokenBackend"
    with django_capture_on_commit_callbacks(execute=True):
        services.set_booking_status(booking.pk, BookingStatus.CONFIRMED)
    booking.refresh_from_db()
    assert booking.status == BookingStatus.CONFIRMED
    assert Notification.objects.get(user=student, kind="confirmed").emailed_at is None


class BrokenBackend:
    def __init__(self, *a, **k):
        pass

    def send_messages(self, messages):
        raise OSError("mail server down")


def test_student_cancelling_does_not_notify_themselves(student, booking):
    res = client_for(student).post(f"/api/v1/bookings/{booking.pk}/cancel/")
    assert res.status_code == 200
    assert not Notification.objects.filter(kind="cancelled").exists()


def test_staff_cancelling_notifies(student, booking):
    services.set_booking_status(booking.pk, BookingStatus.CANCELLED)
    assert Notification.objects.filter(user=student, kind="cancelled").exists()


def test_assigning_session_and_venue_notifies_once(student, staff, booking):
    url = f"/api/v1/manage/bookings/{booking.pk}/"
    body = {"assigned_slot": "afternoon", "assigned_venue": "Test Centre"}
    client_for(staff).patch(url, body, format="json")
    client_for(staff).patch(url, body, format="json")  # unchanged: no second message
    n = Notification.objects.filter(user=student, kind="assigned")
    assert n.count() == 1 and "Test Centre" in n.first().body


def test_resolving_a_change_request_notifies(student, staff, booking):
    client_for(staff).patch(f"/api/v1/manage/bookings/{booking.pk}/", {"resolve_change": True}, format="json")
    assert Notification.objects.filter(user=student, kind="change_resolved").exists()


def test_list_and_mark_read_are_private_to_the_student(student, staff, booking):
    other = User.objects.create_user("other@example.com", "Str0ng-pass-123", full_name="Other")
    c = client_for(student)
    data = c.get("/api/v1/notifications/").json()
    assert data["unread"] == 1 and data["results"][0]["booking_id"] == booking.pk
    assert client_for(other).get("/api/v1/notifications/").json() == {"unread": 0, "results": []}

    nid = data["results"][0]["id"]
    assert (
        client_for(other).post("/api/v1/notifications/read/", {"ids": [nid]}, format="json").json()["unread"]
        == 0
    )
    assert c.get("/api/v1/notifications/").json()["unread"] == 1  # the other user could not touch it
    assert c.post("/api/v1/notifications/read/", {"all": True}, format="json").json()["unread"] == 0
    assert c.post("/api/v1/notifications/read/", {}, format="json").status_code == 400


def test_anonymous_cannot_read_notifications():
    assert APIClient().get("/api/v1/notifications/").status_code in (401, 403)


def test_email_preference_is_editable_on_the_profile(student):
    res = client_for(student).patch("/api/v1/auth/me/", {"email_notifications": False}, format="json")
    assert res.status_code == 200 and res.json()["email_notifications"] is False


def test_staff_remark_reaches_the_student(student, staff, booking, django_capture_on_commit_callbacks):
    url = f"/api/v1/manage/bookings/{booking.pk}/message/"
    assert client_for(staff).post(url, {"message": " "}, format="json").status_code == 400
    with django_capture_on_commit_callbacks(execute=True):
        res = client_for(staff).post(
            url, {"message": "Please bring a printed copy of your passport."}, format="json"
        )
    assert res.status_code == 200 and res.json()["remarks"][0]["body"].startswith("Please bring")
    n = Notification.objects.get(user=student, kind="remark")
    assert n.title.startswith("Message from our team") and n.emailed_at is not None
    assert client_for(student).post(url, {"message": "hi"}, format="json").status_code == 403


def test_unconfirmed_booking_moves_at_once_and_confirmed_needs_approval(student, staff, make_session):
    a, b, c = make_session(seats_total=3), make_session(seats_total=3), make_session(seats_total=3)
    bk, _ = services.create_booking(student, a.pk, {})
    api = client_for(student)
    res = api.post(f"/api/v1/bookings/{bk.pk}/change-date/", {"session": b.pk}, format="json")
    assert (
        res.status_code == 200 and res.json()["session"]["id"] == b.pk
    )  # not confirmed: moved straight away

    services.set_booking_status(bk.pk, BookingStatus.CONFIRMED)
    b.refresh_from_db()
    assert b.seats_booked == 1
    res = api.post(f"/api/v1/bookings/{bk.pk}/change-date/", {"session": c.pk}, format="json")
    assert res.status_code == 200 and res.json()["session"]["id"] == b.pk  # still on b until approved
    assert res.json()["requested_session"]["id"] == c.pk and res.json()["change_open"] is True

    res = client_for(staff).patch(
        f"/api/v1/manage/bookings/{bk.pk}/", {"approve_date_change": True}, format="json"
    )
    assert (
        res.status_code == 200
        and res.json()["session"]["id"] == c.pk
        and res.json()["requested_session"] is None
    )
    b.refresh_from_db(), c.refresh_from_db()
    assert (b.seats_booked, c.seats_booked) == (0, 1)
    assert Notification.objects.filter(user=student, kind="date_changed").exists()


def test_date_change_rules(student, make_session):
    a, full, closed = (
        make_session(),
        make_session(seats_total=1, seats_booked=1),
        make_session(is_visible=False),
    )
    bk, _ = services.create_booking(student, a.pk, {})
    api = client_for(student)
    url = f"/api/v1/bookings/{bk.pk}/change-date/"
    for target in (a, full, closed):
        assert api.post(url, {"session": target.pk}, format="json").status_code == 400
    assert api.post(url, {}, format="json").status_code == 400


def test_declining_a_date_change_keeps_the_booking(student, staff, make_session):
    a, c = make_session(), make_session()
    bk, _ = services.create_booking(student, a.pk, {})
    services.set_booking_status(bk.pk, BookingStatus.CONFIRMED)
    client_for(student).post(f"/api/v1/bookings/{bk.pk}/change-date/", {"session": c.pk}, format="json")
    res = client_for(staff).patch(
        f"/api/v1/manage/bookings/{bk.pk}/", {"resolve_change": True}, format="json"
    )
    assert res.json()["session"]["id"] == a.pk and res.json()["requested_session"] is None
