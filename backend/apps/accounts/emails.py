from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

VERIFY_SALT = "verify-email"
VERIFY_MAX_AGE = 60 * 60 * 24 * 3


def make_verify_token(user) -> str:
    return signing.dumps({"uid": user.pk, "email": user.email}, salt=VERIFY_SALT)


def read_verify_token(token: str) -> dict:
    return signing.loads(token, salt=VERIFY_SALT, max_age=VERIFY_MAX_AGE)


def send_verification_email(user) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={make_verify_token(user)}"
    send_mail(
        "Verify your email for bookyourielts.com",
        f"Namaste {user.full_name},\n\nPlease confirm your email address by opening this link "
        f"(valid for 3 days):\n{link}\n\nIf you did not create an account, you can ignore this email.\n\n"
        "bookyourielts.com",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )


def send_password_reset_email(user) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        "Reset your bookyourielts.com password",
        f"Namaste {user.full_name},\n\nUse this link to choose a new password:\n{link}\n\n"
        "If you did not ask for this, you can ignore this email; your password will not change.\n\n"
        "bookyourielts.com",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
