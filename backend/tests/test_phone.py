import pytest
from django.core.exceptions import ValidationError

from apps.core.phone import normalize_nepal_phone


@pytest.mark.parametrize(
    "raw",
    [
        "9801234567",
        "+9779801234567",
        "977 9801234567",
        "+977-980-123-4567",
        "09801234567",
        "009779801234567",
        " 98 0123 4567 ",
    ],
)
def test_valid_variants_normalise(raw):
    assert normalize_nepal_phone(raw) == "+9779801234567"


def test_97_prefix_accepted():
    assert normalize_nepal_phone("9712345678") == "+9779712345678"


@pytest.mark.parametrize(
    "raw", ["", "123", "9601234567", "980123456", "98012345678", "abcdefghij", "+9769801234567", "014412345"]
)
def test_invalid_rejected(raw):
    with pytest.raises(ValidationError):
        normalize_nepal_phone(raw)
