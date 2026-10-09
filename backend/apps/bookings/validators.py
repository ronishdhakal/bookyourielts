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
