from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import PhoneField
from apps.catalog.api import SessionSerializer
from apps.catalog.models import City, TestFormat, TestType
from apps.core.api import CsrfProtectedMixin, InquiryRateThrottle
from apps.core.nepal import DISTRICTS, PROVINCES

from . import services
from .models import BookingRequest, BookingStatus, Examinee, Inquiry
from .validators import validate_passport_file


def _django_validator(fn):
    """Adapt a Django validator so it raises a DRF ValidationError."""

    def run(value):
        try:
            fn(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages[0]) from e

    return run


class BookingSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    whatsapp_url = serializers.SerializerMethodField()
    has_passport = serializers.SerializerMethodField()
    change_open = serializers.BooleanField(read_only=True)
    requested_session = SessionSerializer(read_only=True)
    assigned_slot_label = serializers.CharField(source="get_assigned_slot_display", read_only=True)

    class Meta:
        model = BookingRequest
        fields = [
            "id",
            "reference",
            "status",
            "status_label",
            "session",
            "whatsapp_url",
            "created_at",
            "examinee",
            "candidate_name",
            "candidate_phone",
            "candidate_email",
            "date_of_birth",
            "province",
            "district",
            "municipality",
            "has_passport",
            "assigned_slot",
            "assigned_slot_label",
            "assigned_venue",
            "candidate",
            "change_request",
            "change_requested_at",
            "change_open",
            "requested_session",
        ]

    def get_whatsapp_url(self, obj) -> str:
        return services.booking_whatsapp_url(obj)

    def get_has_passport(self, obj) -> bool:
        return bool(obj.passport)


class BookingCreateSerializer(serializers.Serializer):
    """Candidate details from the booking form. Everything except the session is optional so the
    endpoint stays usable by simple clients; the website form asks for the essentials."""

    session = serializers.IntegerField()
    candidate = serializers.IntegerField(required=False, allow_null=True)
    save_candidate = serializers.BooleanField(required=False, default=False)
    relation = serializers.CharField(max_length=40, required=False, allow_blank=True)
    examinee = serializers.ChoiceField(choices=Examinee.choices, default=Examinee.SELF)
    candidate_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    candidate_phone = PhoneField(required=False, allow_blank=True)
    candidate_email = serializers.EmailField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    province = serializers.ChoiceField(choices=list(PROVINCES), required=False, allow_blank=True)
    district = serializers.CharField(max_length=40, required=False, allow_blank=True)
    municipality = serializers.CharField(max_length=80, required=False, allow_blank=True)
    passport = serializers.FileField(
        required=False, allow_null=True, validators=[_django_validator(validate_passport_file)]
    )

    def validate_date_of_birth(self, value):
        today = timezone.localdate()
        if value is None:
            return value
        if value >= today:
            raise serializers.ValidationError("Date of birth must be in the past.")
        if (today - value).days < 14 * 365:
            raise serializers.ValidationError("Candidates must be at least 14 years old.")
        if (today - value).days > 100 * 365:
            raise serializers.ValidationError("Check the year of birth.")
        return value

    def validate(self, attrs):
        district, province = attrs.get("district", ""), attrs.get("province", "")
        if district and district not in DISTRICTS:
            raise serializers.ValidationError({"district": "Choose a district from the list."})
        if district and province and district not in PROVINCES[province]:
            raise serializers.ValidationError({"district": f"{district} is not in {province} province."})
        return attrs


CANDIDATE_TO_BOOKING = {
    "full_name": "candidate_name",
    "phone": "candidate_phone",
    "email": "candidate_email",
    "date_of_birth": "date_of_birth",
    "province": "province",
    "district": "district",
    "municipality": "municipality",
}


def _resolve_candidate(user, data: dict):
    """Fill the booking details from a saved candidate, and optionally save a new candidate.

    Mutates `data` (the validated booking fields). Returns the Candidate used, None, or an error Response.
    """
    from .models import Candidate

    cand_id = data.pop("candidate", None)
    save = data.pop("save_candidate", False)
    relation = data.pop("relation", "")
    cand = None
    if cand_id:
        cand = Candidate.objects.filter(pk=cand_id, user=user).first()
        if cand is None:
            return Response(
                {"candidate": ["This saved candidate was not found."]}, status=status.HTTP_400_BAD_REQUEST
            )
        for src, dst in CANDIDATE_TO_BOOKING.items():
            if not data.get(dst):
                data[dst] = getattr(cand, src)
        if not data.get("passport") and cand.passport:
            data["passport"] = cand.passport
    elif save and data.get("candidate_name"):
        from django.db.models import Q

        qs = Candidate.objects.filter(user=user, full_name__iexact=data["candidate_name"].strip())
        if data.get("date_of_birth"):
            qs = qs.filter(Q(date_of_birth=data["date_of_birth"]) | Q(date_of_birth__isnull=True))
        cand = qs.first()
        if cand is None and Candidate.objects.filter(user=user).count() < 20:
            cand = Candidate(user=user, full_name=data["candidate_name"].strip())
        if cand is not None:
            for src, dst in CANDIDATE_TO_BOOKING.items():
                if data.get(dst):
                    setattr(cand, src, data[dst])
            if relation:
                cand.relation = relation
            if data.get("passport"):
                cand.passport = data["passport"]
            cand.save()
    if cand is not None:
        data["candidate"] = cand
    return cand


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends: list = []
    pagination_class = None
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        return BookingCreateSerializer if self.request.method == "POST" else BookingSerializer

    def get_queryset(self):
        return BookingRequest.objects.filter(user=self.request.user).select_related(
            "user", "session__city", "session__venue", "session__test_type"
        )

    @extend_schema(
        request=BookingCreateSerializer, responses={201: BookingSerializer, 200: BookingSerializer}
    )
    def create(self, request, *args, **kwargs):
        ser = BookingCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        session_id = data.pop("session")
        saved = _resolve_candidate(request.user, data)
        if isinstance(saved, Response):
            return saved
        if data.get("passport") is None:
            data.pop("passport", None)
        if "passport" not in data:
            return Response(
                {"passport": ["Upload a photo of the passport page."]}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            booking, created = services.create_booking(request.user, session_id, data)
        except services.BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def _my_booking(request, pk):
    return get_object_or_404(
        BookingRequest.objects.select_related(
            "user", "session__city", "session__venue", "session__test_type"
        ),
        pk=pk,
        user=request.user,
    )


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=BookingSerializer)
    def get(self, request, pk: int):
        return Response(BookingSerializer(_my_booking(request, pk)).data)


class BookingWhatsAppView(APIView):
    """Records the hand-off click and returns the WhatsApp link (final step, and resend)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=BookingSerializer)
    def post(self, request, pk: int):
        booking = _my_booking(request, pk)
        booking.whatsapp_clicked_at = timezone.now()
        booking.save(update_fields=["whatsapp_clicked_at", "updated_at"])
        return Response(BookingSerializer(booking).data)


class BookingCancelView(APIView):
    """Students can withdraw a request that has not been confirmed yet."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=BookingSerializer)
    def post(self, request, pk: int):
        booking = _my_booking(request, pk)
        if booking.status != BookingStatus.INITIATED:
            return Response(
                {
                    "detail": (
                        "Only requests that are not yet confirmed can be withdrawn. "
                        "Contact us to change a confirmed booking."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        services.set_booking_status(booking.pk, BookingStatus.CANCELLED, notify=False)
        return Response(BookingSerializer(_my_booking(request, pk)).data)


class InquirySerializer(serializers.ModelSerializer):
    phone = PhoneField()
    preferred_city = serializers.SlugRelatedField(
        slug_field="slug", queryset=City.objects.filter(is_active=True), required=False, allow_null=True
    )
    test_type = serializers.SlugRelatedField(
        slug_field="code", queryset=TestType.objects.filter(is_active=True), required=False, allow_null=True
    )
    format = serializers.ChoiceField(choices=TestFormat.choices, required=False, allow_blank=True)
    preferred_month = serializers.RegexField(
        r"^\d{4}-(0[1-9]|1[0-2])$",
        required=False,
        allow_blank=True,
        error_messages={"invalid": "Use YYYY-MM."},
    )
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "preferred_city",
            "test_type",
            "format",
            "preferred_month",
            "message",
            "status",
            "created_at",
            "whatsapp_url",
        ]
        read_only_fields = ["id", "status", "created_at"]
        extra_kwargs = {"email": {"required": False, "allow_blank": True}, "message": {"max_length": 1000}}

    def get_whatsapp_url(self, obj) -> str:
        return services.inquiry_whatsapp_url(obj)


class InquiryCreateView(CsrfProtectedMixin, generics.CreateAPIView):
    """Guests and logged-in students can both send an inquiry."""

    permission_classes = [AllowAny]
    serializer_class = InquirySerializer
    throttle_classes = [InquiryRateThrottle]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class MyInquiryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InquirySerializer
    filter_backends: list = []
    pagination_class = None

    def get_queryset(self):
        return Inquiry.objects.filter(user=self.request.user).select_related("preferred_city", "test_type")
