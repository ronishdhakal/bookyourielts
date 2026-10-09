"""Load demo venues and test dates for LOCAL DEVELOPMENT ONLY.

Cities, test types, FAQs and site settings come from migrations. This command adds
fake venues and fake dates so the schedule has something to show.
"""

import random
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import City, SessionSlot, TestFormat, TestSession, TestType, Venue

FEES = {
    "academic": 28000,
    "general-training": 28000,
    "ukvi-academic": 33500,
    "ukvi-general-training": 33500,
    "life-skills": 29500,
}
BIG_CITIES = {"kathmandu", "pokhara"}


class Command(BaseCommand):
    help = "Create demo venues and test dates (development only)."

    def add_arguments(self, parser):
        parser.add_argument("--weeks", type=int, default=10)
        parser.add_argument(
            "--admin", action="store_true", help="Also create admin@example.com / admin12345 (dev only)."
        )
        parser.add_argument("--force", action="store_true", help="Allow running with DEBUG off.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if not settings.DEBUG and not opts["force"]:
            raise CommandError(
                "seed_demo is for local development. Refusing to run with DEBUG off (use --force)."
            )
        rng = random.Random(7)
        today = timezone.localdate()
        types = {t.code: t for t in TestType.objects.all()}
        created = 0
        for city in City.objects.filter(is_active=True):
            venue, _ = Venue.objects.get_or_create(
                city=city,
                name=f"Demo Test Centre, {city.name}",
                defaults={"address": "Demo address (not a real venue)"},
            )
            for week in range(1, opts["weeks"] + 1):
                day = today + timedelta(days=7 * week + (2 if week % 2 else 0))
                offerings = [
                    ("academic", TestFormat.COMPUTER, SessionSlot.MORNING),
                    ("general-training", TestFormat.COMPUTER, SessionSlot.AFTERNOON),
                ]
                if city.slug in BIG_CITIES:
                    offerings += [
                        ("academic", TestFormat.COMPUTER_WOP, SessionSlot.MORNING),
                        ("ukvi-academic", TestFormat.COMPUTER, SessionSlot.AFTERNOON),
                    ]
                    if week % 3 == 0:
                        offerings.append(("life-skills", TestFormat.COMPUTER, SessionSlot.MORNING))
                elif week % 2:
                    continue  # smaller cities get a date every other week
                for code, fmt, slot in offerings:
                    total = rng.choice([12, 20, 24, 40])
                    booked = rng.choice([0, 0, 3, total - 3, total])
                    _, was_created = TestSession.objects.get_or_create(
                        date=day,
                        slot=slot,
                        city=city,
                        test_type=types[code],
                        format=fmt,
                        defaults={
                            "venue": venue,
                            "fee_npr": FEES[code] + (1500 if fmt == TestFormat.COMPUTER_WOP else 0),
                            "seats_total": total,
                            "seats_booked": booked,
                            "speaking_note": "Speaking is a separate slot, within 7 days before or after.",
                        },
                    )
                    created += was_created
        if opts["admin"]:
            if not User.objects.filter(email="admin@example.com").exists():
                User.objects.create_superuser("admin@example.com", "admin12345", full_name="Demo Admin")
                self.stdout.write("Created admin@example.com / admin12345")
        self.stdout.write(self.style.SUCCESS(f"Demo data ready: {created} new dates."))
