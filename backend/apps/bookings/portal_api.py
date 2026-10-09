"""Student portal endpoints: saved candidates, date alerts, later document upload, change requests."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import PhoneField
from apps.catalog.models import City, TestFormat, TestType
from apps.core.nepal import PROVINCES

from .alerts import alert_stats
from .api import BookingSerializer, _django_validator
from .models import BookingRequest, BookingStatus, Candidate, DateAlert, Notification
from .validators import check_date_of_birth, check_region, validate_passport_file

MAX_CANDIDATES = 20
MAX_ALERTS = 10


# ------------------------------------------------------------------ saved candidates
class CandidateSerializer(serializers.ModelSerializer):
    phone = PhoneField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    province = serializers.ChoiceField(choices=list(PROVINCES), required=False, allow_blank=True)
    has_passport_front = serializers.SerializerMethodField()
    has_passport_back = serializers.SerializerMethodField()
    passport_front = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[_django_validator(validate_passport_file)],
    )
    passport_back = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[_django_validator(validate_passport_file)],
    )

    class Meta:
        model = Candidate
        fields = [
            "id",
            "relation",
            "full_name",
            "phone",
            "email",
            "date_of_birth",
            "province",
            "district",
            "municipality",
            "has_passport_front",
            "has_passport_back",
            "passport_front",
            "passport_back",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_has_passport_front(self, obj) -> bool:
        return bool(obj.passport_front)

    def get_has_passport_back(self, obj) -> bool:
        return bool(obj.passport_back)

    def validate_date_of_birth(self, value):
        try:
            return check_date_of_birth(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages[0]) from e

    def validate(self, attrs):
        inst = self.instance
        province = attrs.get("province", inst.province if inst else "")
        district = attrs.get("district", inst.district if inst else "")
        try:
            check_region(province, district)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict) from e
        return attrs


class CandidateListCreate(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateSerializer
    pagination_class = None
    filter_backends: list = []
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Candidate.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if self.get_queryset().count() >= MAX_CANDIDATES:
            return Response(
                {"detail": f"You can save up to {MAX_CANDIDATES} candidates. Delete one you no longer need."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CandidateDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateSerializer
    filter_backends: list = []
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Candidate.objects.filter(user=self.request.user)


# ------------------------------------------------------------------ date alerts
class DateAlertSerializer(serializers.ModelSerializer):
    provider = serializers.ChoiceField(
        choices=[("british_council", "British Council"), ("idp", "IDP")], required=False, allow_blank=True
    )
    category = serializers.ChoiceField(
        choices=[("regular", "Regular"), ("ukvi", "UKVI")], required=False, allow_blank=True
    )
    test_type = serializers.SlugRelatedField(
        slug_field="code", queryset=TestType.objects.filter(is_active=True), required=False, allow_null=True
    )
    test_format = serializers.ChoiceField(choices=TestFormat.choices, required=False, allow_blank=True)
    city = serializers.SlugRelatedField(
        slug_field="slug", queryset=City.objects.filter(is_active=True), required=False, allow_null=True
    )
    month = serializers.RegexField(
        r"^\d{4}-(0[1-9]|1[0-2])$",
        required=False,
        allow_blank=True,
        error_messages={"invalid": "Use YYYY-MM."},
    )
    matches = serializers.SerializerMethodField()
    new_matches = serializers.SerializerMethodField()
    next_date = serializers.SerializerMethodField()

    class Meta:
        model = DateAlert
        fields = [
            "id",
            "provider",
            "category",
            "test_type",
            "test_format",
            "city",
            "month",
            "is_active",
            "created_at",
            "matches",
            "new_matches",
            "next_date",
        ]
        read_only_fields = ["id", "created_at"]

    def _stats(self, obj) -> dict:
        cache = self.context.setdefault("_stats", {})
        if obj.pk not in cache:
            cache[obj.pk] = alert_stats(obj)
        return cache[obj.pk]

    def get_matches(self, obj) -> int:
        return self._stats(obj)["matches"]

    def get_new_matches(self, obj) -> int:
        return self._stats(obj)["new_matches"]

    def get_next_date(self, obj):
        return self._stats(obj)["next_date"]


class AlertListCreate(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DateAlertSerializer
    pagination_class = None
    filter_backends: list = []

    def get_queryset(self):
        return DateAlert.objects.filter(user=self.request.user).select_related("test_type", "city")

    def create(self, request, *args, **kwargs):
        if self.get_queryset().filter(is_active=True).count() >= MAX_ALERTS:
            return Response(
                {"detail": f"You can keep {MAX_ALERTS} active alerts. Remove one to add another."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AlertDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DateAlertSerializer
    filter_backends: list = []
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return DateAlert.objects.filter(user=self.request.user).select_related("test_type", "city")


class AlertSeen(APIView):
    """Mark the current matches as seen, so only newly opened dates count as new next time."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=DateAlertSerializer)
    def post(self, request, pk: int):
        alert = get_object_or_404(DateAlert, pk=pk, user=request.user)
        alert.last_seen_at = timezone.now()
        alert.save(update_fields=["last_seen_at"])
        return Response(DateAlertSerializer(alert).data)


# ------------------------------------------------------------------ booking extras
def _my_booking(request, pk):
    return get_object_or_404(
        BookingRequest.objects.select_related(
            "user", "session__city", "session__venue", "session__test_type"
        ),
        pk=pk,
        user=request.user,
    )


class BookingDocumentsView(APIView):
    """Add or replace passport images after the request was made."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=None, responses=BookingSerializer)
    def post(self, request, pk: int):
        booking = _my_booking(request, pk)
        if booking.status == BookingStatus.CANCELLED:
            return Response({"detail": "This request was cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        errors, changed = {}, []
        for field in ("passport_front", "passport_back"):
            f = request.FILES.get(field)
            if not f:
                continue
            try:
                validate_passport_file(f)
            except DjangoValidationError as e:
                errors[field] = e.messages
                continue
            setattr(booking, field, f)
            changed.append(field)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        if not changed:
            return Response(
                {"detail": "Choose a passport file to upload."}, status=status.HTTP_400_BAD_REQUEST
            )
        booking.save(update_fields=[*changed, "updated_at"])
        return Response(BookingSerializer(booking).data)


class ChangeRequestSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=5, max_length=1000)


class BookingChangeRequestView(APIView):
    """Ask the team for a change (another date, a corrected name). Staff see it flagged on the request."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangeRequestSerializer, responses=BookingSerializer)
    def post(self, request, pk: int):
        booking = _my_booking(request, pk)
        if booking.status == BookingStatus.CANCELLED:
            return Response({"detail": "This request was cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        ser = ChangeRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        booking.change_request = ser.validated_data["message"].strip()
        booking.change_requested_at = timezone.now()
        booking.save(update_fields=["change_request", "change_requested_at", "updated_at"])
        return Response(BookingSerializer(booking).data)


# ------------------------------------------------------------------ notifications
class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()
    booking_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "booking_id", "is_read", "created_at"]

    def get_is_read(self, obj) -> bool:
        return obj.read_at is not None


class NotificationListView(APIView):
    """The student's latest notifications plus how many are unread."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=NotificationSerializer(many=True))
    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        return Response(
            {
                "unread": qs.filter(read_at__isnull=True).count(),
                "results": NotificationSerializer(qs[:50], many=True).data,
            }
        )


class NotificationReadView(APIView):
    """Mark some notifications ({"ids": [..]}) or all of them ({"all": true}) as read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        qs = Notification.objects.filter(user=request.user, read_at__isnull=True)
        ids = request.data.get("ids")
        if request.data.get("all"):
            pass
        elif isinstance(ids, list) and all(isinstance(i, int) for i in ids):
            qs = qs.filter(pk__in=ids)
        else:
            return Response({"detail": "Say which notifications to mark as read."}, status=400)
        qs.update(read_at=timezone.now())
        unread = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({"unread": unread})
