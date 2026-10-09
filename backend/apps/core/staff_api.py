"""Staff-only API behind the frontend admin dashboard (/api/v1/manage/...).

Django admin stays available for everything else; these endpoints cover the daily work:
overview numbers, booking requests, inquiries, test dates and site settings.
"""

from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings import notifications, services
from apps.bookings.alerts import matching_sessions
from apps.bookings.models import BookingRequest, BookingStatus, DateAlert, Inquiry, InquiryStatus
from apps.catalog.api import SessionSerializer
from apps.catalog.models import City, Provider, SessionSlot, TestFormat, TestSession, TestType, Venue

from .models import SiteSettings


class IsStaff(BasePermission):
    message = "Staff access only."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class StaffView:
    permission_classes = [IsStaff]


# --------------------------------------------------------------------------- overview
class StatsView(StaffView, APIView):
    def get(self, request):
        today = timezone.localdate()
        cfg = SiteSettings.load()
        by_status = dict(BookingRequest.objects.values_list("status").annotate(n=Count("id")).order_by())
        upcoming = TestSession.objects.filter(is_visible=True, date__gte=today)
        window = upcoming.filter(date__lte=today + timedelta(days=30)).aggregate(
            total=Sum("seats_total"), booked=Sum("seats_booked")
        )
        since = timezone.now() - timedelta(days=13)
        per_day = dict(
            BookingRequest.objects.filter(created_at__gte=since)
            .annotate(d=TruncDate("created_at"))
            .values_list("d")
            .annotate(n=Count("id"))
            .order_by("d")
        )
        series = [
            {"date": str(today - timedelta(days=i)), "count": per_day.get(today - timedelta(days=i), 0)}
            for i in range(13, -1, -1)
        ]
        low = [
            s
            for s in upcoming.select_related("city", "venue", "test_type").order_by("date")[:120]
            if s.is_registration_open() and 0 < s.seats_available <= cfg.low_seat_threshold
        ][:6]
        recent = BookingRequest.objects.select_related("user", "session__city", "session__test_type")[:6]
        return Response(
            {
                "bookings": {
                    "initiated": by_status.get(BookingStatus.INITIATED, 0),
                    "confirmed": by_status.get(BookingStatus.CONFIRMED, 0),
                    "cancelled": by_status.get(BookingStatus.CANCELLED, 0),
                    "total": sum(by_status.values()),
                },
                "new_inquiries": Inquiry.objects.filter(status=InquiryStatus.NEW).count(),
                "change_requests": BookingRequest.objects.filter(change_requested_at__isnull=False)
                .filter(
                    Q(change_resolved_at__isnull=True) | Q(change_resolved_at__lt=F("change_requested_at"))
                )
                .count(),
                "alerts": _alert_demand(),
                "open_dates": upcoming.filter(registration_closes_on__gte=today).count(),
                "hidden_dates": TestSession.objects.filter(is_visible=False, date__gte=today).count(),
                "seats_next_30_days": {"total": window["total"] or 0, "booked": window["booked"] or 0},
                "students": _student_count(),
                "per_day": series,
                "low_seat_dates": SessionSerializer(low, many=True).data,
                "recent_bookings": [
                    {
                        "id": b.id,
                        "reference": b.reference,
                        "status": b.status,
                        "student": b.candidate_name or b.user.full_name,
                        "test": b.session.test_type.name,
                        "city": b.session.city.name,
                        "date": b.session.date,
                        "created_at": b.created_at,
                    }
                    for b in recent
                ],
            }
        )


def _alert_demand() -> dict:
    """Active alerts, and how many of them have no date to offer yet (unmet demand)."""
    active = list(DateAlert.objects.filter(is_active=True).select_related("test_type", "city"))
    unmatched = sum(1 for a in active if not matching_sessions(a).exists())
    return {"active": len(active), "unmatched": unmatched}


def _student_count() -> int:
    from apps.accounts.models import User

    return User.objects.filter(is_staff=False).count()


# --------------------------------------------------------------------------- bookings
class _UserBrief(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    phone = serializers.CharField()


class StaffBookingSerializer(serializers.ModelSerializer):
    user = _UserBrief(read_only=True)
    session = SessionSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    has_passport = serializers.SerializerMethodField()
    whatsapp_url = serializers.SerializerMethodField()
    change_open = serializers.BooleanField(read_only=True)
    remarks = serializers.SerializerMethodField()
    requested_session = SessionSerializer(read_only=True)

    class Meta:
        model = BookingRequest
        fields = [
            "id",
            "reference",
            "status",
            "status_label",
            "created_at",
            "whatsapp_clicked_at",
            "user",
            "session",
            "examinee",
            "candidate_name",
            "candidate_phone",
            "candidate_email",
            "date_of_birth",
            "province",
            "district",
            "municipality",
            "has_passport",
            "admin_notes",
            "whatsapp_url",
            "change_request",
            "change_requested_at",
            "change_open",
            "assigned_slot",
            "assigned_venue",
            "assigned_at",
            "remarks",
            "requested_session",
        ]
        read_only_fields = [
            f for f in fields if f not in ("status", "admin_notes", "assigned_slot", "assigned_venue")
        ]

    def get_remarks(self, obj) -> list:
        notes = obj.notifications.filter(kind="remark").order_by("-created_at")[:20]
        return [
            {"id": n.id, "body": n.body, "created_at": n.created_at, "is_read": n.read_at is not None}
            for n in notes
        ]

    def get_has_passport(self, obj) -> bool:
        return bool(obj.passport)

    def get_whatsapp_url(self, obj) -> str:
        phone = (obj.candidate_phone or obj.user.phone).lstrip("+")
        return f"https://wa.me/{phone}" if phone else ""


def _bookings_qs():
    return BookingRequest.objects.select_related(
        "user", "session__city", "session__venue", "session__test_type"
    )


class StaffBookingList(StaffView, generics.ListAPIView):
    serializer_class = StaffBookingSerializer
    filter_backends: list = []

    def get_queryset(self):
        qs = _bookings_qs()
        p = self.request.query_params
        if p.get("status") in BookingStatus.values:
            qs = qs.filter(status=p["status"])
        if p.get("city"):
            qs = qs.filter(session__city__slug=p["city"])
        if p.get("provider") in Provider.values:
            qs = qs.filter(session__provider=p["provider"])
        if p.get("change") == "open":
            qs = qs.filter(change_requested_at__isnull=False).filter(
                Q(change_resolved_at__isnull=True) | Q(change_resolved_at__lt=F("change_requested_at"))
            )
        if q := p.get("q", "").strip():
            qs = qs.filter(
                Q(reference__icontains=q)
                | Q(candidate_name__icontains=q)
                | Q(candidate_phone__icontains=q)
                | Q(user__full_name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__phone__icontains=q)
            )
        return qs


class StaffBookingDetail(StaffView, generics.RetrieveUpdateAPIView):
    serializer_class = StaffBookingSerializer
    queryset = _bookings_qs()
    http_method_names = ["get", "patch", "head", "options"]

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        new_status = request.data.get("status")
        if new_status is not None and new_status not in BookingStatus.values:
            return Response({"status": ["Unknown status."]}, status=status.HTTP_400_BAD_REQUEST)
        if "assigned_slot" in request.data or "assigned_venue" in request.data:
            previous = (booking.assigned_slot, booking.assigned_venue)
            slot = request.data.get("assigned_slot", booking.assigned_slot)
            if slot not in ("", *SessionSlot.values):
                return Response(
                    {"assigned_slot": ["Choose morning or afternoon."]}, status=status.HTTP_400_BAD_REQUEST
                )
            booking.assigned_slot = slot
            booking.assigned_venue = str(request.data.get("assigned_venue", booking.assigned_venue))[:150]
            booking.assigned_at = (
                timezone.now() if (booking.assigned_slot or booking.assigned_venue) else None
            )
            booking.save(update_fields=["assigned_slot", "assigned_venue", "assigned_at", "updated_at"])
            if booking.assigned_at and (slot, booking.assigned_venue) != previous:
                notifications.session_assigned(booking)
        if request.data.get("approve_date_change"):
            if booking.requested_session_id is None:
                return Response(
                    {"detail": "There is no date change to approve."}, status=status.HTTP_400_BAD_REQUEST
                )
            try:
                services.move_booking(booking.pk, booking.requested_session_id)
            except services.BookingError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            booking.refresh_from_db()
            booking.change_resolved_at = timezone.now()
            booking.save(update_fields=["change_resolved_at", "updated_at"])
        if request.data.get("resolve_change"):
            if booking.requested_session_id:
                booking.requested_session = None
                booking.save(update_fields=["requested_session", "updated_at"])
            booking.change_resolved_at = timezone.now()
            booking.save(update_fields=["change_resolved_at", "updated_at"])
            notifications.change_resolved(booking)
        if "admin_notes" in request.data:
            booking.admin_notes = str(request.data["admin_notes"])[:5000]
            booking.save(update_fields=["admin_notes", "updated_at"])
        if new_status and new_status != booking.status:
            try:
                services.set_booking_status(booking.pk, new_status)  # keeps seat counts right
            except services.BookingError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StaffBookingSerializer(self.get_queryset().get(pk=booking.pk)).data)


class StaffBookingMessageView(StaffView, APIView):
    """Send a remark to the student. It appears in their portal and goes out by email."""

    def post(self, request, pk: int):
        booking = get_object_or_404(_bookings_qs(), pk=pk)
        message = str(request.data.get("message", "")).strip()
        if len(message) < 2:
            return Response(
                {"message": ["Write a message for the student."]}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(message) > 1000:
            return Response(
                {"message": ["Keep it under 1000 characters."]}, status=status.HTTP_400_BAD_REQUEST
            )
        notifications.remark(booking, message)
        return Response(StaffBookingSerializer(_bookings_qs().get(pk=booking.pk)).data)


class StaffPassportView(StaffView, APIView):
    def get(self, request, pk: int):
        booking = get_object_or_404(BookingRequest, pk=pk)
        f = booking.passport
        if not f:
            raise Http404
        response = FileResponse(f.open("rb"))
        response["Cache-Control"] = "private, no-store"
        return response


# --------------------------------------------------------------------------- inquiries
class StaffInquirySerializer(serializers.ModelSerializer):
    preferred_city_name = serializers.CharField(source="preferred_city.name", read_only=True, default="")
    test_type_name = serializers.CharField(source="test_type.name", read_only=True, default="")
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    format_label = serializers.CharField(source="get_format_display", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "preferred_city_name",
            "test_type_name",
            "format",
            "format_label",
            "preferred_month",
            "message",
            "status",
            "status_label",
            "admin_notes",
            "created_at",
        ]
        read_only_fields = [f for f in fields if f not in ("status", "admin_notes")]


class StaffInquiryList(StaffView, generics.ListAPIView):
    serializer_class = StaffInquirySerializer
    filter_backends: list = []

    def get_queryset(self):
        qs = Inquiry.objects.select_related("preferred_city", "test_type")
        p = self.request.query_params
        if p.get("status") in InquiryStatus.values:
            qs = qs.filter(status=p["status"])
        if q := p.get("q", "").strip():
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q))
        return qs


class StaffInquiryDetail(StaffView, generics.RetrieveUpdateAPIView):
    serializer_class = StaffInquirySerializer
    queryset = Inquiry.objects.select_related("preferred_city", "test_type")
    http_method_names = ["get", "patch", "head", "options"]


# --------------------------------------------------------------------------- test dates
class StaffSessionSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True, default="")
    test_type_name = serializers.CharField(source="test_type.name", read_only=True)
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    format_label = serializers.CharField(source="get_format_display", read_only=True)
    booking_count = serializers.IntegerField(read_only=True, default=0)
    seat_status = serializers.SerializerMethodField()
    weekday = serializers.SerializerMethodField()

    class Meta:
        model = TestSession
        fields = [
            "id",
            "date",
            "weekday",
            "provider",
            "provider_label",
            "slot",
            "city",
            "city_name",
            "venue",
            "venue_name",
            "test_type",
            "test_type_name",
            "format",
            "format_label",
            "fee_npr",
            "seats_total",
            "seats_booked",
            "seat_status",
            "registration_closes_on",
            "results_date",
            "speaking_note",
            "is_visible",
            "notes",
            "booking_count",
        ]
        read_only_fields = ["seats_booked"]
        extra_kwargs = {"registration_closes_on": {"required": False}, "results_date": {"required": False}}

    def get_seat_status(self, obj) -> str:
        return obj.seat_status(SiteSettings.load().low_seat_threshold)

    def get_weekday(self, obj) -> str:
        return obj.date.strftime("%A")

    def validate(self, attrs):
        inst = self.instance
        get = lambda k, default=None: attrs.get(k, getattr(inst, k, default) if inst else default)  # noqa: E731
        test_type, fmt, venue, city = get("test_type"), get("format"), get("venue"), get("city")
        if test_type and test_type.is_ukvi and fmt == TestFormat.COMPUTER_WOP:
            raise serializers.ValidationError(
                {"format": "UKVI tests are not available with Writing on Paper."}
            )
        if venue and city and venue.city_id != city.pk:
            raise serializers.ValidationError({"venue": "This venue belongs to a different city."})
        if inst and attrs.get("seats_total") is not None and attrs["seats_total"] < inst.seats_booked:
            raise serializers.ValidationError(
                {
                    "seats_total": (
                        f"{inst.seats_booked} seats are already confirmed, so the total cannot go lower."
                    )
                }
            )
        return attrs


class StaffSessionList(StaffView, generics.ListCreateAPIView):
    serializer_class = StaffSessionSerializer
    filter_backends: list = []

    def get_queryset(self):
        qs = TestSession.objects.select_related("city", "venue", "test_type").annotate(
            booking_count=Count("booking_requests", filter=~Q(booking_requests__status="cancelled"))
        )
        p = self.request.query_params
        today = timezone.localdate()
        if p.get("when") == "past":
            qs = qs.filter(date__lt=today).order_by("-date", "-id")
        else:
            qs = qs.order_by("date", "slot", "id")
            if p.get("when") != "all":
                qs = qs.filter(date__gte=today)
        if p.get("city"):
            qs = qs.filter(city__slug=p["city"])
        if p.get("provider") in Provider.values:
            qs = qs.filter(provider=p["provider"])
        if p.get("visible") in ("true", "false"):
            qs = qs.filter(is_visible=p["visible"] == "true")
        return qs


class StaffSessionDetail(StaffView, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StaffSessionSerializer
    queryset = TestSession.objects.select_related("city", "venue", "test_type").annotate(
        booking_count=Count("booking_requests", filter=~Q(booking_requests__status="cancelled"))
    )
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def destroy(self, request, *args, **kwargs):
        s = self.get_object()
        if s.booking_requests.exists():
            return Response(
                {"detail": "This date has booking requests, so it cannot be deleted. Hide it instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        s.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkSessionsView(StaffView, APIView):
    """Delete, hide or show several dates at once. Dates that have booking requests are never deleted."""

    def post(self, request):
        ids = request.data.get("ids")
        action = request.data.get("action")
        if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids) or len(ids) > 500:
            return Response({"detail": "Choose at least one date."}, status=status.HTTP_400_BAD_REQUEST)
        qs = TestSession.objects.filter(pk__in=ids)
        if action == "hide":
            return Response({"updated": qs.update(is_visible=False)})
        if action == "show":
            return Response({"updated": qs.update(is_visible=True)})
        if action == "delete":
            blocked = qs.filter(booking_requests__isnull=False).distinct()
            skipped = blocked.count()
            deleted, _ = qs.exclude(pk__in=blocked.values("pk")).delete()
            return Response({"deleted": deleted, "skipped": skipped})
        return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)


def _bulk_ids(request):
    ids = request.data.get("ids")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids) or len(ids) > 500:
        return None
    return ids


class BulkCreateSessionsView(StaffView, APIView):
    """Create one date for each day picked, all with the same city, exam, format, fee and seats.

    A day that already has the same exam, format, provider and city is skipped, never duplicated."""

    MAX_DATES = 120

    def post(self, request):
        raw = request.data.get("dates")
        if not isinstance(raw, list) or not raw or len(raw) > self.MAX_DATES:
            return Response(
                {"dates": [f"Choose between 1 and {self.MAX_DATES} dates."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            days = sorted({date.fromisoformat(str(d)) for d in raw})
        except ValueError:
            return Response({"dates": ["Every date must look like 2026-10-13."]}, status=400)
        common = {k: v for k, v in request.data.items() if k not in ("dates", "date")}
        common.setdefault("seats_total", 5)
        created, skipped = [], []
        with transaction.atomic():
            for day in days:
                ser = StaffSessionSerializer(data={**common, "date": day.isoformat()})
                if not ser.is_valid():
                    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
                v = ser.validated_data
                exists = TestSession.objects.filter(
                    date=day,
                    city=v["city"],
                    test_type=v["test_type"],
                    format=v.get("format", TestFormat.COMPUTER),
                    provider=v.get("provider", Provider.BRITISH_COUNCIL),
                ).exists()
                if exists:
                    skipped.append(day.isoformat())
                else:
                    ser.save()
                    created.append(day.isoformat())
        return Response({"created": len(created), "skipped": skipped, "dates": created})


class BulkBookingsView(StaffView, APIView):
    """Delete several booking requests. Confirmed ones give their seat back first."""

    def post(self, request):
        ids = _bulk_ids(request)
        if ids is None or request.data.get("action") != "delete":
            return Response({"detail": "Choose at least one request."}, status=status.HTTP_400_BAD_REQUEST)
        deleted = 0
        for booking in BookingRequest.objects.filter(pk__in=ids):
            with transaction.atomic():
                if booking.status == BookingStatus.CONFIRMED:
                    services.set_booking_status(booking.pk, BookingStatus.CANCELLED, notify=False)
                if booking.passport:
                    booking.passport.delete(save=False)
                booking.delete()
                deleted += 1
        return Response({"deleted": deleted})


class BulkInquiriesView(StaffView, APIView):
    """Delete several inquiries."""

    def post(self, request):
        ids = _bulk_ids(request)
        if ids is None or request.data.get("action") != "delete":
            return Response({"detail": "Choose at least one inquiry."}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = Inquiry.objects.filter(pk__in=ids).delete()
        return Response({"deleted": deleted})


class MetaView(StaffView, APIView):
    """Choices for the date form."""

    def get(self, request):
        return Response(
            {
                "cities": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "venues": [{"id": v.id, "name": v.name} for v in c.venues.filter(is_active=True)],
                    }
                    for c in City.objects.filter(is_active=True).prefetch_related("venues")
                ],
                "test_types": [
                    {"id": t.id, "name": t.name, "is_ukvi": t.is_ukvi}
                    for t in TestType.objects.filter(is_active=True)
                ],
                "providers": [{"value": v, "label": label} for v, label in Provider.choices],
                "formats": [{"value": v, "label": label} for v, label in TestFormat.choices],
                "venues_total": Venue.objects.count(),
            }
        )


# --------------------------------------------------------------------------- settings
class StaffSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "whatsapp_number",
            "booking_message_template",
            "inquiry_message_template",
            "general_inquiry_message_template",
            "contact_email",
            "contact_phone",
            "office_address",
            "low_seat_threshold",
            "announcement",
            "footer_disclaimer",
        ]


class StaffSettingsView(StaffView, generics.RetrieveUpdateAPIView):
    serializer_class = StaffSettingsSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return SiteSettings.load()
