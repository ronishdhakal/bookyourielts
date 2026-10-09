from django.core.exceptions import ValidationError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# (extension, leading bytes). Content is checked, not just the file name or declared type.
_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],
    ".pdf": [b"%PDF-"],
}


def validate_passport_file(f) -> None:
    name = (f.name or "").lower()
    ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in _SIGNATURES:
        raise ValidationError("Upload a JPG, PNG, WebP or PDF file.")
    if f.size > MAX_UPLOAD_BYTES:
        raise ValidationError("The file is larger than 10 MB. Choose a smaller photo or scan.")
    head = f.read(16)
    f.seek(0)
    if not any(head.startswith(sig) for sig in _SIGNATURES[ext]) or (ext == ".webp" and b"WEBP" not in head):
        raise ValidationError("This file does not look like a valid image or PDF.")


def check_date_of_birth(value):
    """Shared by bookings and saved candidates. Raises Django ValidationError."""
    from django.utils import timezone

    if value is None:
        return value
    today = timezone.localdate()
    if value >= today:
        raise ValidationError("Date of birth must be in the past.")
    if (today - value).days < 14 * 365:
        raise ValidationError("Candidates must be at least 14 years old.")
    if (today - value).days > 100 * 365:
        raise ValidationError("Check the year of birth.")
    return value


def check_region(province: str, district: str) -> None:
    from apps.core.nepal import DISTRICTS, PROVINCES

    if province and province not in PROVINCES:
        raise ValidationError({"province": "Choose a province from the list."})
    if district and district not in DISTRICTS:
        raise ValidationError({"district": "Choose a district from the list."})
    if district and province and district not in PROVINCES[province]:
        raise ValidationError({"district": f"{district} is not in {province} province."})
