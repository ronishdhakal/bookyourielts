from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView

from .models import FAQ, ContentBlock, SiteSettings


class CsrfProtectedMixin:
    """DRF only enforces CSRF for already-authenticated sessions. Endpoints that
    change state for anonymous users (login, register, guest inquiry) opt in here."""

    @method_decorator(csrf_protect)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


class InquiryRateThrottle(SimpleRateThrottle):
    """One bucket per logged-in user, or per IP for guests."""

    scope = "inquiry"

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class EmailRateThrottle(AnonRateThrottle):
    scope = "email"


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "whatsapp_number",
            "contact_email",
            "contact_phone",
            "office_address",
            "low_seat_threshold",
            "announcement",
            "footer_disclaimer",
        ]


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "page", "question", "answer"]


class ContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentBlock
        fields = ["key", "title", "body"]


class CsrfView(APIView):
    """Sets the csrftoken cookie so the frontend can send X-CSRFToken."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []

    @extend_schema(responses=inline_serializer("Csrf", {"csrfToken": serializers.CharField()}))
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class SiteSettingsView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=SiteSettingsSerializer)
    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)


class FAQListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=FAQSerializer(many=True))
    def get(self, request):
        qs = FAQ.objects.filter(is_active=True)
        page = request.query_params.get("page")
        if page:
            qs = qs.filter(page=page)
        return Response(FAQSerializer(qs, many=True).data)


class ContentBlockListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=ContentBlockSerializer(many=True))
    def get(self, request):
        return Response(ContentBlockSerializer(ContentBlock.objects.all(), many=True).data)


class RegionsView(APIView):
    """Provinces and their districts, for the address fields on the booking form."""

    permission_classes = [AllowAny]

    @extend_schema(responses=inline_serializer("Regions", {"provinces": serializers.DictField()}))
    def get(self, request):
        from .nepal import PROVINCES

        return Response({"provinces": PROVINCES})
