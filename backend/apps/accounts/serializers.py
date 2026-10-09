from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.phone import normalize_nepal_phone

User = get_user_model()


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return normalize_nepal_phone(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages[0]) from e


class UserSerializer(serializers.ModelSerializer):
    phone = PhoneField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "date_of_birth",
            "email_verified",
            "email_notifications",
            "is_staff",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "email_verified", "is_staff", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    full_name = serializers.CharField(max_length=120)
    phone = PhoneField()

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Try logging in.")
        return value

    def validate(self, attrs):
        probe = User(email=attrs["email"], full_name=attrs["full_name"])
        try:
            validate_password(attrs["password"], probe)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)}) from e
        return attrs

    def create(self, validated):
        return User.objects.create_user(**validated)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField()


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)
