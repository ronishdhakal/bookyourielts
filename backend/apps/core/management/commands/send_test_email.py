from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email to check the EMAIL_* settings. Usage: manage.py send_test_email you@example.com"

    def add_arguments(self, parser):
        parser.add_argument("to")

    def handle(self, *args, to, **options):
        backend = settings.EMAIL_BACKEND.rsplit(".", 2)[-2]
        self.stdout.write(f"Using the {backend} backend, from {settings.DEFAULT_FROM_EMAIL}.")
        if backend == "console":
            self.stdout.write("EMAIL_HOST is empty, so the message is only printed below, not sent.")
        try:
            send_mail(
                "bookyourielts.com test email",
                "If you can read this, email sending works.",
                settings.DEFAULT_FROM_EMAIL,
                [to],
            )
        except Exception as e:  # noqa: BLE001
            raise CommandError(f"Could not send: {e}") from e
        self.stdout.write(self.style.SUCCESS(f"Sent to {to}."))
