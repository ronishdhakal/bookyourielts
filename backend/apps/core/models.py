import os
import re

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


def _validate_whatsapp_number(value: str) -> None:
    if not re.fullmatch(r"\d{8,15}", value):
        raise ValidationError("Digits only, with country code and no + sign, e.g. 9779860688212.")


class SiteSettings(models.Model):
    """Single editable record holding site-wide configuration."""

    whatsapp_number = models.CharField(
        max_length=20,
        validators=[_validate_whatsapp_number],
        help_text="Admin WhatsApp number with country code, digits only (e.g. 9779860688212).",
    )
    booking_message_template = models.TextField(
        default=(
            "Hi, my name is {full_name}. I want to book IELTS. "
            "Test: {test_type} ({format}), Date: {date}, City: {city}. Reference: {booking_ref}"
        ),
        help_text="Placeholders: {full_name} {test_type} {format} {date} {city} {booking_ref}",
    )
    inquiry_message_template = models.TextField(
        default=(
            "Hi, my name is {name}. I want to book IELTS but I can't see dates for {city}/{test_type}. "
            "Please let me know about upcoming dates."
        ),
        help_text="Placeholders: {name} {city} {test_type} {format} {month}",
    )
    general_inquiry_message_template = models.TextField(
        default="Hi, my name is {name}. I have a question about IELTS booking. {message}",
        help_text="Used for general questions (not date searches). Placeholders: {name} {message}",
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    office_address = models.CharField(max_length=255, blank=True)
    low_seat_threshold = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text="Show 'Few seats left' when this many seats or fewer remain.",
    )
    announcement = models.CharField(
        max_length=255,
        blank=True,
        help_text="Banner shown at the top of the site. Leave empty to hide.",
    )
    footer_disclaimer = models.TextField(
        default=(
            "bookyourielts.com is an independent service. IELTS is jointly owned by the "
            "British Council, IDP IELTS and Cambridge University Press & Assessment. "
            "We are not affiliated with or endorsed by them."
        )
    )

    class Meta:
        verbose_name = "site settings"
        verbose_name_plural = "site settings"

    def __str__(self) -> str:
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # singleton, never deleted
        pass

    @classmethod
    def load(cls) -> "SiteSettings":
        obj, _ = cls.objects.get_or_create(
            pk=1, defaults={"whatsapp_number": os.environ.get("ADMIN_WHATSAPP_NUMBER", "9779860688212")}
        )
        return obj


class FAQ(models.Model):
    class Page(models.TextChoices):
        GENERAL = "general", "General (home page)"
        BOOKING = "booking", "Booking"
        FEES = "fees", "Fees and refunds"
        COMPUTER = "computer", "IELTS on computer"
        MODULES = "modules", "Academic vs General Training"

    page = models.CharField(max_length=20, choices=Page.choices, default=Page.GENERAL, db_index=True)
    question = models.CharField(max_length=255)
    answer = models.TextField(help_text="Plain text. Blank lines start a new paragraph.")
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["page", "order", "id"]
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"

    def __str__(self) -> str:
        return self.question


class ContentBlock(models.Model):
    """A small admin-editable piece of text used on information pages."""

    key = models.SlugField(unique=True, help_text="Identifier used by the website. Do not change.")
    title = models.CharField(max_length=150)
    body = models.TextField(
        help_text="Plain text. Blank lines start a new paragraph; lines starting '- ' become bullets."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return self.title
