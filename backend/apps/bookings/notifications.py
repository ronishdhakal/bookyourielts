"""Tell students what happened to their booking: a portal notification, and an email when enabled.

Email is best effort. A missing or broken mail setup never blocks a booking or a staff action."""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.emailing import send_branded

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
    link = f"{settings.FRONTEND_URL}/portal{path}"
    try:
        send_branded(
            [n.user.email],
            n.title,
            heading=n.title,
            preheader=n.body[:110],
            paragraphs=[f"Namaste {n.user.full_name},", *n.body.split("\n\n")],
            details=_details(n.booking) if n.booking else None,
            button=("View my booking", link),
            footnote="You can turn these emails off in Profile after you log in.",
        )
    except Exception:  # noqa: BLE001 - mail must never break a booking
        log.exception("Could not email notification %s", n.pk)
        return
    Notification.objects.filter(pk=n.pk).update(emailed_at=timezone.now())


def _details(b: BookingRequest) -> list[tuple[str, str]]:
    s = b.session
    return [
        ("Reference", b.reference),
        ("Exam", f"{s.test_type.name} ({s.get_format_display()})"),
        ("Test date", f"{s.date:%A, %d %B %Y}"),
        ("City", s.city.name),
        ("Status", b.get_status_display()),
    ]


def _send_staff_alert(booking_id: int) -> None:
    """Tell the team a new request came in, so they can reply on WhatsApp quickly."""
    recipients = settings.ADMIN_NOTIFY_EMAILS
    b = (
        BookingRequest.objects.select_related("user", "session__city", "session__test_type")
        .filter(pk=booking_id)
        .first()
    )
    if not recipients or b is None:
        return
    who = b.candidate_name or b.user.full_name
    phone = b.candidate_phone or b.user.phone
    try:
        send_branded(
            recipients,
            f"New booking request {b.reference}: {who}",
            heading="New booking request",
            preheader=f"{who}, {_ref_line(b)}",
            paragraphs=[
                "A student has just submitted a booking request. Please check the details and reply."
            ],
            details=[
                ("Student", who),
                ("Mobile", phone),
                ("Email", b.candidate_email or b.user.email),
                *_details(b),
                ("Passport photo", "Uploaded" if b.passport else "Missing"),
            ],
            button=("Open in the dashboard", f"{settings.FRONTEND_URL}/portal/manage/bookings/{b.pk}"),
        )
    except Exception:  # noqa: BLE001 - never break a booking because the team alert failed
        log.exception("Could not email the team about booking %s", booking_id)


def notify(booking: BookingRequest, kind: str, title: str, body: str) -> Notification:
    n = Notification.objects.create(user=booking.user, kind=kind, title=title, body=body, booking=booking)
    transaction.on_commit(lambda: _send_email(n.pk, f"/bookings/{booking.pk}"))
    return n


def booking_received(b: BookingRequest) -> None:
    transaction.on_commit(lambda: _send_staff_alert(b.pk))
    notify(
        b,
        Kind.RECEIVED,
        f"We received your request {b.reference}",
        (
            f"Thank you. We received your booking request for {_ref_line(b)}.\n\n"
            "Our team will check your details and confirm your seat, then explain payment. "
            "For a quicker reply, message us on WhatsApp from your booking page."
        ),
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


def remark(b: BookingRequest, message: str) -> Notification:
    """A free-text message from staff, shown in the student's portal and emailed."""
    return notify(b, Kind.REMARK, f"Message from our team about {b.reference}", message.strip())


def date_changed(b: BookingRequest, old_label: str) -> None:
    notify(
        b,
        Kind.DATE_CHANGED,
        f"Your test date for {b.reference} changed",
        f"Your booking {b.reference} moved from {old_label} to {_ref_line(b)}. "
        "Session time and venue will be assigned again for the new date.",
    )


def change_resolved(b: BookingRequest) -> None:
    notify(
        b,
        Kind.CHANGE_RESOLVED,
        f"We handled your change request for {b.reference}",
        f"Our team has handled the change you asked for on {b.reference}. Open the booking to check it.",
    )
