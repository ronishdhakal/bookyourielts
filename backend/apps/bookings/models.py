from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.catalog.models import City, TestFormat, TestSession, TestType


class BookingStatus(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"


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
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"], name="booking_user_created_idx")]

    def __str__(self) -> str:
        return self.reference or f"Booking #{self.pk}"

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
