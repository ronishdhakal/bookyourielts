"""Booking business logic. Seat counts only ever change through these functions."""

from django.db import transaction
from django.utils import timezone

from apps.catalog.models import TestSession
from apps.core.models import SiteSettings

from .models import BookingRequest, BookingStatus, Inquiry


class BookingError(Exception):
    """A booking rule was violated. The message is safe to show to users."""


ACTIVE = (BookingStatus.INITIATED, BookingStatus.CONFIRMED)


@transaction.atomic
def create_booking(user, session_id: int) -> tuple[BookingRequest, bool]:
    """Create (or reuse) an initiated booking request. Returns (booking, created)."""
    session = (
        TestSession.objects.select_related("city", "venue", "test_type")
        .filter(pk=session_id, is_visible=True)
        .first()
    )
    if session is None:
        raise BookingError("This test date is no longer available.")
    if not session.is_registration_open():
        raise BookingError("Registration for this date has closed.")
    if session.seats_available <= 0:
        raise BookingError("This date is full. Please choose another date or send us an inquiry.")

    existing = BookingRequest.objects.filter(user=user, session=session, status__in=ACTIVE).first()
    if existing:
        return existing, False
    booking = BookingRequest.objects.create(user=user, session=session, whatsapp_clicked_at=timezone.now())
    return booking, True


@transaction.atomic
def set_booking_status(booking_id: int, new_status: str) -> BookingRequest:
    """Change a booking's status, keeping seats_booked in step. Prevents overbooking."""
    booking = BookingRequest.objects.select_for_update().get(pk=booking_id)
    session = TestSession.objects.select_for_update().get(pk=booking.session_id)
    was_confirmed = booking.status == BookingStatus.CONFIRMED
    will_confirm = new_status == BookingStatus.CONFIRMED

    if will_confirm and not was_confirmed:
        if session.seats_booked >= session.seats_total:
            raise BookingError("No seats left on this date. Increase the total seats first.")
        session.seats_booked += 1
        session.save(update_fields=["seats_booked", "updated_at"])
    elif was_confirmed and not will_confirm:
        session.seats_booked = max(session.seats_booked - 1, 0)
        session.save(update_fields=["seats_booked", "updated_at"])

    booking.status = new_status
    booking.save(update_fields=["status", "updated_at"])
    return booking


def _fmt_date(d) -> str:
    return f"{d:%d %b %Y}"


def booking_whatsapp_url(booking: BookingRequest) -> str:
    from urllib.parse import quote

    cfg = SiteSettings.load()
    s = booking.session
    text = _safe_format(
        cfg.booking_message_template,
        full_name=booking.user.full_name,
        test_type=s.test_type.name,
        format=s.get_format_display(),
        date=_fmt_date(s.date),
        city=s.city.name,
        booking_ref=booking.reference,
    )
    return f"https://wa.me/{cfg.whatsapp_number}?text={quote(text)}"


def inquiry_whatsapp_url(inquiry: Inquiry) -> str:
    from urllib.parse import quote

    cfg = SiteSettings.load()
    text = _safe_format(
        cfg.inquiry_message_template,
        name=inquiry.name,
        city=inquiry.preferred_city.name if inquiry.preferred_city else "any city",
        test_type=inquiry.test_type.name if inquiry.test_type else "any test type",
        format=inquiry.get_format_display() or "any format",
        month=inquiry.preferred_month or "any month",
    )
    return f"https://wa.me/{cfg.whatsapp_number}?text={quote(text)}"


class _Safe(dict):
    def __missing__(self, key):
        return "{" + key + "}"


def _safe_format(template: str, **values) -> str:
    # Tolerate typos in admin-edited templates instead of raising.
    try:
        return template.format_map(_Safe(values))
    except (ValueError, IndexError, KeyError, AttributeError):
        return template
