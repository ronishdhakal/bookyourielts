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
        ]

    def get_whatsapp_url(self, obj) -> str:
        return services.booking_whatsapp_url(obj)

    def get_has_passport(self, obj) -> bool:
        return bool(obj.passport_front)


class BookingCreateSerializer(serializers.Serializer):
    """Candidate details from the booking form. Everything except the session is optional so the
    endpoint stays usable by simple clients; the website form asks for the essentials."""

    session = serializers.IntegerField()
    examinee = serializers.ChoiceField(choices=Examinee.choices, default=Examinee.SELF)
    candidate_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    candidate_phone = PhoneField(required=False, allow_blank=True)
    candidate_email = serializers.EmailField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    province = serializers.ChoiceField(choices=list(PROVINCES), required=False, allow_blank=True)
    district = serializers.CharField(max_length=40, required=False, allow_blank=True)
    municipality = serializers.CharField(max_length=80, required=False, allow_blank=True)
    passport_front = serializers.FileField(
        required=False, allow_null=True, validators=[_django_validator(validate_passport_file)]
    )
    passport_back = serializers.FileField(
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
        for key in ("passport_front", "passport_back"):
            if data.get(key) is None:
                data.pop(key, None)
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
        services.set_booking_status(booking.pk, BookingStatus.CANCELLED)
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
