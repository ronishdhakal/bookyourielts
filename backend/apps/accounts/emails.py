from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.core.emailing import send_branded

VERIFY_SALT = "verify-email"
VERIFY_MAX_AGE = 60 * 60 * 24 * 3


def make_verify_token(user) -> str:
    return signing.dumps({"uid": user.pk, "email": user.email}, salt=VERIFY_SALT)


def read_verify_token(token: str) -> dict:
    return signing.loads(token, salt=VERIFY_SALT, max_age=VERIFY_MAX_AGE)


def send_verification_email(user) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={make_verify_token(user)}"
    send_branded(
        [user.email],
        "Verify your email for bookyourielts.com",
        heading="Confirm your email address",
        preheader="One tap to finish setting up your account.",
        paragraphs=[
            f"Namaste {user.full_name},",
            "Thanks for creating an account. Please confirm your email address so we can send you "
            "updates about your IELTS bookings.",
        ],
        button=("Confirm my email", link),
        footnote="The link works for 3 days. If you did not create an account, you can ignore this email.",
    )


def send_password_reset_email(user) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_branded(
        [user.email],
        "Reset your bookyourielts.com password",
        heading="Choose a new password",
        preheader="Use this link to reset your password.",
        paragraphs=[
            f"Namaste {user.full_name},",
            "We received a request to reset the password for your account. Use the button below to "
            "choose a new one.",
        ],
        button=("Reset my password", link),
        footnote="If you did not ask for this, ignore this email. Your password will not change.",
    )
