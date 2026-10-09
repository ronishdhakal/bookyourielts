"""Nepali mobile number validation and normalisation."""

import re

from django.core.exceptions import ValidationError

_MOBILE = re.compile(r"^9[78]\d{8}$")


def normalize_nepal_phone(raw: str) -> str:
    """Return the number as +977XXXXXXXXXX or raise ValidationError.

    Accepts common variants: 98XXXXXXXX, 098XXXXXXXX, 977 98XXXXXXXX,
    +977-98XXXXXXXX, 00977 98XXXXXXXX, with spaces, dashes or brackets.
    Only mobile numbers (prefix 97 or 98) are accepted.
    """
    digits = re.sub(r"[\s\-().]", "", (raw or "").strip())
    if digits.startswith("+"):
        digits = digits[1:]
    elif digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("977") and len(digits) == 13:
        digits = digits[3:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not digits.isdigit() or not _MOBILE.match(digits):
        raise ValidationError(
            "Enter a valid Nepali mobile number, for example 98XXXXXXXX or +977 98XXXXXXXX.",
            code="invalid_phone",
        )
    return f"+977{digits}"
