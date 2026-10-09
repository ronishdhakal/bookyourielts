from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import AuthRateThrottle, CsrfProtectedMixin, EmailRateThrottle

from . import emails
from .serializers import (
    EmailSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    TokenSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(CsrfProtectedMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=RegisterSerializer, responses=UserSerializer)
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        emails.send_verification_email(user)
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        get_token(request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(CsrfProtectedMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=LoginSerializer, responses=UserSerializer)
    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = authenticate(
            request, username=ser.validated_data["email"].lower(), password=ser.validated_data["password"]
        )
        if user is None:
            return Response({"detail": "Incorrect email or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        get_token(request)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=UserSerializer, responses=UserSerializer)
    def patch(self, request):
        ser = UserSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class VerifyEmailView(CsrfProtectedMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=TokenSerializer, responses={200: None})
    def post(self, request):
        ser = TokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            data = emails.read_verify_token(ser.validated_data["token"])
        except signing.BadSignature:
            return Response(
                {"detail": "This verification link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(pk=data["uid"], email=data["email"]).first()
        if user is None:
            return Response(
                {"detail": "This verification link is invalid."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])
        return Response({"detail": "Email verified."})


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [EmailRateThrottle]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        if not request.user.email_verified:
            emails.send_verification_email(request.user)
        return Response({"detail": "Verification email sent."})


class PasswordResetRequestView(CsrfProtectedMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [EmailRateThrottle]

    @extend_schema(request=EmailSerializer, responses={200: None})
    def post(self, request):
        ser = EmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=ser.validated_data["email"], is_active=True).first()
        if user:
            emails.send_password_reset_email(user)
        # Same response either way so the endpoint does not reveal which emails exist.
        return Response({"detail": "If that email has an account, a reset link is on its way."})


class PasswordResetConfirmView(CsrfProtectedMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: None})
    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(d["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, d["token"]):
            return Response(
                {"detail": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            validate_password(d["password"], user)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(d["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can log in now."})
