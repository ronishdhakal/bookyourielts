from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import PhoneField
from apps.catalog.api import SessionSerializer
from apps.catalog.models import City, TestFormat, TestType
from apps.core.api import CsrfProtectedMixin, InquiryRateThrottle

from . import services
from .models import BookingRequest, Inquiry


class BookingSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = BookingRequest
        fields = ["id", "reference", "status", "status_label", "session", "whatsapp_url", "created_at"]

    def get_whatsapp_url(self, obj) -> str:
        return services.booking_whatsapp_url(obj)


class BookingCreateSerializer(serializers.Serializer):
    session = serializers.IntegerField()


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends: list = []
    pagination_class = None

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
        try:
            booking, created = services.create_booking(request.user, ser.validated_data["session"])
        except services.BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingSerializer(booking).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class BookingWhatsAppView(APIView):
    """Re-send: records the click and returns a fresh WhatsApp link."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=BookingSerializer)
    def post(self, request, pk: int):
        from django.shortcuts import get_object_or_404
        from django.utils import timezone

        booking = get_object_or_404(
            BookingRequest.objects.select_related(
                "user", "session__city", "session__venue", "session__test_type"
            ),
            pk=pk,
            user=request.user,
        )
        booking.whatsapp_clicked_at = timezone.now()
        booking.save(update_fields=["whatsapp_clicked_at", "updated_at"])
        return Response(BookingSerializer(booking).data)


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
