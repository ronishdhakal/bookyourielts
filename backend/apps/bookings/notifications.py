"""Tell students what happened to their booking: a portal notification, and an email when enabled.

Email is best effort. A missing or broken mail setup never blocks a booking or a staff action."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import BookingRequest, Notification

log = logging.getLogger(__name__)
Kind = Notification.Kind


def _ref_line(b: BookingRequest) -> str:
    s = b.session
    return f"{s.test_type.name} ({s.get_format_display()}) in {s.city.name} on {s.date:%d %b %Y}"


def _send_email(notification_id: int, path: str) -> None:
    n = Notification.objects.select_related("user").filter(pk=notification_id).first()
    if n is None or not n.user.email_notifications or not n.user.email:
        return
    link = f"{settings.FRONTEND_URL}{path}"
    text = (
        f"Namaste {n.user.full_name},\n\n{n.body}\n\nOpen your booking: {link}\n\n"
        "You can turn these emails off in Profile on bookyourielts.com.\n"
        "bookyourielts.com is an independent service and is not affiliated with the "
        "British Council, IDP or Cambridge."
    )
    try:
        send_mail(n.title, text, settings.DEFAULT_FROM_EMAIL, [n.user.email])
    except Exception:  # noqa: BLE001 - mail must never break a booking
        log.exception("Could not email notification %s", n.pk)
        return
    Notification.objects.filter(pk=n.pk).update(emailed_at=timezone.now())


def notify(booking: BookingRequest, kind: str, title: str, body: str) -> Notification:
    n = Notification.objects.create(user=booking.user, kind=kind, title=title, body=body, booking=booking)
    transaction.on_commit(lambda: _send_email(n.pk, f"/bookings/{booking.pk}"))
    return n


def booking_received(b: BookingRequest) -> None:
    notify(
        b,
        Kind.RECEIVED,
        f"We received your request {b.reference}",
        f"Your request {b.reference} for {_ref_line(b)} is with our team. We will confirm it once "
        "we have checked your details and arranged payment with you.",
    )


def booking_confirmed(b: BookingRequest) -> None:
    notify(
        b,
        Kind.CONFIRMED,
        f"Your booking {b.reference} is confirmed",
        f"Good news. Your booking {b.reference} for {_ref_line(b)} is confirmed. "
        "Your session time and venue will be sent to you in the portal as soon as they are assigned.",
    )


def booking_cancelled(b: BookingRequest) -> None:
    notify(
        b,
        Kind.CANCELLED,
        f"Your request {b.reference} was cancelled",
        f"Your request {b.reference} for {_ref_line(b)} was cancelled. If this is a surprise, "
        "contact us and we will look into it.",
    )


def session_assigned(b: BookingRequest) -> None:
    parts = [b.get_assigned_slot_display()] if b.assigned_slot else []
    if b.assigned_venue:
        parts.append(b.assigned_venue)
    where = " at ".join(parts) if parts else "to be announced"
    notify(
        b,
        Kind.ASSIGNED,
        f"Session and venue for {b.reference}",
        f"Your session and venue for {_ref_line(b)}: {where}. Please arrive early and bring your passport.",
    )


def change_resolved(b: BookingRequest) -> None:
    notify(
        b,
        Kind.CHANGE_RESOLVED,
        f"We handled your change request for {b.reference}",
        f"Our team has handled the change you asked for on {b.reference}. Open the booking to check it.",
    )
