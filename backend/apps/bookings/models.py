import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.catalog.models import City, TestFormat, TestSession, TestType


class BookingStatus(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"


def passport_upload_path(instance, filename: str) -> str:
    """Random file names so a leaked URL cannot be guessed from a reference."""
    return f"passports/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


class Examinee(models.TextChoices):
    SELF = "self", "Myself"
    OTHER = "other", "Someone else"


class Candidate(models.Model):
    """A person a student books for (themselves, a child, a client). Saved once, reused for every booking."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="candidates")
    relation = models.CharField(max_length=40, blank=True, help_text="For example: Myself, Son, Client")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=16, blank=True)
    email = models.EmailField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    province = models.CharField(max_length=40, blank=True)
    district = models.CharField(max_length=40, blank=True)
    municipality = models.CharField(max_length=80, blank=True)
    passport_front = models.FileField(upload_to=passport_upload_path, blank=True)
    passport_back = models.FileField(upload_to=passport_upload_path, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name", "id"]

    def __str__(self) -> str:
        return self.full_name


class BookingRequest(models.Model):
    reference = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="booking_requests"
    )
    session = models.ForeignKey(TestSession, on_delete=models.PROTECT, related_name="booking_requests")
    status = models.CharField(
        max_length=12, choices=BookingStatus.choices, default=BookingStatus.INITIATED, db_index=True
    )
    whatsapp_clicked_at = models.DateTimeField(null=True, blank=True)

    # Candidate details, collected before the booking is handed to the team.
    examinee = models.CharField(max_length=10, choices=Examinee.choices, default=Examinee.SELF)
    candidate_name = models.CharField(max_length=120, blank=True)
    candidate_phone = models.CharField(max_length=16, blank=True)
    candidate_email = models.EmailField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    province = models.CharField(max_length=40, blank=True)
    district = models.CharField(max_length=40, blank=True)
    municipality = models.CharField(max_length=80, blank=True, verbose_name="city / municipality")
    passport_front = models.FileField(upload_to=passport_upload_path, blank=True)
    passport_back = models.FileField(upload_to=passport_upload_path, blank=True)

    candidate = models.ForeignKey(
        Candidate, on_delete=models.SET_NULL, null=True, blank=True, related_name="booking_requests"
    )

    # A student can ask for a change (new date, corrected spelling). Staff resolve it.
    change_request = models.TextField(blank=True)
    change_requested_at = models.DateTimeField(null=True, blank=True)
    change_resolved_at = models.DateTimeField(null=True, blank=True)

    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"], name="booking_user_created_idx")]

    def __str__(self) -> str:
        return self.reference or f"Booking #{self.pk}"

    @property
    def change_open(self) -> bool:
        return bool(self.change_requested_at) and (
            self.change_resolved_at is None or self.change_resolved_at < self.change_requested_at
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            year = (self.created_at or timezone.now()).year
            self.reference = f"BYI-{year}-{self.pk:06d}"
            BookingRequest.objects.filter(pk=self.pk).update(reference=self.reference)


class InquiryStatus(models.TextChoices):
    NEW = "new", "New"
    CONTACTED = "contacted", "Contacted"
    CLOSED = "closed", "Closed"


class Inquiry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="inquiries"
    )
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=16)
    email = models.EmailField(blank=True)
    preferred_city = models.ForeignKey(
        City, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    test_type = models.ForeignKey(
        TestType, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    format = models.CharField(max_length=20, choices=TestFormat.choices, blank=True)
    preferred_month = models.CharField(max_length=7, blank=True, help_text="YYYY-MM")
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=12, choices=InquiryStatus.choices, default=InquiryStatus.NEW, db_index=True
    )
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "inquiries"

    def __str__(self) -> str:
        return f"{self.name} ({self.created_at:%d %b %Y})"


class DateAlert(models.Model):
    """A saved search: how many open dates match it, and which are new since the student last looked."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="date_alerts")
    provider = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=10, blank=True, help_text="regular or ukvi")
    test_type = models.ForeignKey(
        TestType, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    test_format = models.CharField(max_length=20, choices=TestFormat.choices, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    month = models.CharField(max_length=7, blank=True, help_text="YYYY-MM")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Alert #{self.pk} for {self.user}"
