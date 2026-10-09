from datetime import date as Date
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.utils.text import slugify


def today_kathmandu() -> Date:
    return timezone.localdate()


class City(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    intro = models.TextField(
        blank=True,
        help_text="Short paragraph shown on this city's IELTS dates page (helps Google). Plain text.",
    )
    order = models.PositiveSmallIntegerField(default=0, help_text="Lower numbers appear first.")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "cities"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Venue(models.Model):
    name = models.CharField(max_length=150)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="venues")
    address = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["city__order", "name"]
        constraints = [models.UniqueConstraint(fields=["city", "name"], name="uniq_venue_per_city")]

    def __str__(self) -> str:
        return f"{self.name} ({self.city})"


class TestType(models.Model):
    __test__ = False  # not a pytest class

    code = models.SlugField(
        unique=True, help_text="Stable identifier, e.g. academic. Used in URLs and filters."
    )
    name = models.CharField(max_length=80)
    is_ukvi = models.BooleanField(
        default=False, help_text="UKVI tests cannot be taken with Writing on Paper."
    )
    description = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name


class TestFormat(models.TextChoices):
    __test__ = False  # not a pytest class

    COMPUTER = "computer", "Computer-delivered"
    COMPUTER_WOP = "computer_wop", "Computer-delivered with Writing on Paper"


class Provider(models.TextChoices):
    """Who runs the test session. Names are used only to describe the session, never as branding."""

    BRITISH_COUNCIL = "british_council", "British Council"
    IDP = "idp", "IDP"


class SessionSlot(models.TextChoices):
    MORNING = "morning", "Morning (about 9:00 am to 12:00 pm)"
    AFTERNOON = "afternoon", "Afternoon (about 1:00 pm to 4:00 pm)"


class SeatStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    FEW = "few_left", "Few seats left"
    FULL = "full", "Full"
    CLOSED = "closed", "Registration closed"


REGISTRATION_CLOSES_DAYS_BEFORE = 6
RESULT_DAYS = {TestFormat.COMPUTER: 5, TestFormat.COMPUTER_WOP: 13}


class TestSession(models.Model):
    """A bookable IELTS test date at a venue."""

    __test__ = False  # not a pytest class

    date = models.DateField(db_index=True)
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        default=Provider.BRITISH_COUNCIL,
        help_text="The organisation that runs this test session.",
    )
    slot = models.CharField(max_length=10, choices=SessionSlot.choices, default=SessionSlot.MORNING)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="sessions")
    venue = models.ForeignKey(Venue, on_delete=models.PROTECT, null=True, blank=True, related_name="sessions")
    test_type = models.ForeignKey(TestType, on_delete=models.PROTECT, related_name="sessions")
    format = models.CharField(max_length=20, choices=TestFormat.choices, default=TestFormat.COMPUTER)
    fee_npr = models.PositiveIntegerField(verbose_name="fee (NPR)")
    seats_total = models.PositiveIntegerField(default=0)
    seats_booked = models.PositiveIntegerField(
        default=0, help_text="Updated automatically when bookings are confirmed."
    )
    registration_closes_on = models.DateField(
        null=True, blank=True, help_text="Last day to register. Left empty = 6 days before the test."
    )
    results_date = models.DateField(
        null=True,
        blank=True,
        help_text="Left empty = 5 days after (computer) or 13 days after (writing on paper).",
    )
    speaking_note = models.CharField(
        max_length=255,
        blank=True,
        help_text="e.g. Speaking test is on a separate slot, within 7 days before or after this date.",
    )
    is_visible = models.BooleanField(default=True, help_text="Untick to hide from students.")
    notes = models.TextField(blank=True, help_text="Internal notes, never shown to students.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "slot", "city__order"]
        indexes = [
            models.Index(fields=["date", "city"], name="session_date_city_idx"),
            models.Index(fields=["is_visible", "date"], name="session_visible_date_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(seats_booked__lte=F("seats_total")), name="seats_booked_lte_total"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.date:%d %b %Y} {self.get_slot_display().split(' ')[0]} · {self.city} · {self.test_type}"
        )

    def clean(self):
        if self.test_type_id and self.test_type.is_ukvi and self.format == TestFormat.COMPUTER_WOP:
            raise ValidationError({"format": "UKVI tests are not available with Writing on Paper."})
        if self.venue_id and self.city_id and self.venue.city_id != self.city_id:
            raise ValidationError({"venue": "This venue belongs to a different city."})
        if self.seats_booked > self.seats_total:
            raise ValidationError({"seats_booked": "Booked seats cannot exceed total seats."})

    def save(self, *args, **kwargs):
        if self.date:
            if not self.registration_closes_on:
                self.registration_closes_on = self.date - timedelta(days=REGISTRATION_CLOSES_DAYS_BEFORE)
            if not self.results_date:
                self.results_date = self.date + timedelta(days=RESULT_DAYS[TestFormat(self.format)])
        super().save(*args, **kwargs)

    @property
    def seats_available(self) -> int:
        return max(self.seats_total - self.seats_booked, 0)

    def is_registration_open(self, today: Date | None = None) -> bool:
        today = today or today_kathmandu()
        return self.date >= today and (
            self.registration_closes_on is None or today <= self.registration_closes_on
        )

    def seat_status(self, threshold: int, today: Date | None = None) -> str:
        if not self.is_registration_open(today):
            return SeatStatus.CLOSED
        if self.seats_available <= 0:
            return SeatStatus.FULL
        if self.seats_available <= threshold:
            return SeatStatus.FEW
        return SeatStatus.AVAILABLE
