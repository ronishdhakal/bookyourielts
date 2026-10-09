import threading

import pytest
from django.db import connection

from apps.bookings import services
from apps.bookings.models import BookingRequest, BookingStatus

pytestmark = pytest.mark.django_db


def test_confirm_and_cancel_adjust_seats(make_session, user):
    s = make_session(seats_total=3)
    b = BookingRequest.objects.create(user=user, session=s)
    services.set_booking_status(b.pk, BookingStatus.CONFIRMED)
    s.refresh_from_db()
    assert s.seats_booked == 1
    services.set_booking_status(b.pk, BookingStatus.CONFIRMED)  # idempotent
    s.refresh_from_db()
    assert s.seats_booked == 1
    services.set_booking_status(b.pk, BookingStatus.CANCELLED)
    s.refresh_from_db()
    assert s.seats_booked == 0
    services.set_booking_status(b.pk, BookingStatus.CANCELLED)  # never goes negative
    s.refresh_from_db()
    assert s.seats_booked == 0


def test_initiated_does_not_use_a_seat(make_session, user):
    s = make_session(seats_total=1)
    BookingRequest.objects.create(user=user, session=s)
    s.refresh_from_db()
    assert s.seats_booked == 0


def test_confirm_blocked_when_full(make_session, user, django_user_model):
    s = make_session(seats_total=1)
    a = BookingRequest.objects.create(user=user, session=s)
    other = django_user_model.objects.create_user("b@example.com", "Str0ng-pass-123", full_name="B")
    b = BookingRequest.objects.create(user=other, session=s)
    services.set_booking_status(a.pk, BookingStatus.CONFIRMED)
    with pytest.raises(services.BookingError):
        services.set_booking_status(b.pk, BookingStatus.CONFIRMED)
    s.refresh_from_db()
    b.refresh_from_db()
    assert s.seats_booked == 1 and b.status == BookingStatus.INITIATED


@pytest.mark.django_db(transaction=True, serialized_rollback=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="row locks need PostgreSQL")
def test_concurrent_confirms_never_overbook(make_session, django_user_model):
    s = make_session(seats_total=3)
    bookings = [
        BookingRequest.objects.create(
            user=django_user_model.objects.create_user(
                f"u{i}@example.com", "Str0ng-pass-123", full_name=f"U{i}"
            ),
            session=s,
        )
        for i in range(8)
    ]
    results = []

    def confirm(pk):
        try:
            services.set_booking_status(pk, BookingStatus.CONFIRMED)
            results.append("ok")
        except services.BookingError:
            results.append("full")
        finally:
            connection.close()

    threads = [threading.Thread(target=confirm, args=(b.pk,)) for b in bookings]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    s.refresh_from_db()
    assert s.seats_booked == 3
    assert results.count("ok") == 3 and results.count("full") == 5
    assert BookingRequest.objects.filter(status=BookingStatus.CONFIRMED).count() == 3
