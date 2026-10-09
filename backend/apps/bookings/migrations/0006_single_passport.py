from django.db import migrations


class Migration(migrations.Migration):
    """One passport photo instead of front and back: keep the front file, drop the back."""

    dependencies = [("bookings", "0005_notification")]

    operations = [
        migrations.RenameField("bookingrequest", "passport_front", "passport"),
        migrations.RemoveField("bookingrequest", "passport_back"),
        migrations.RenameField("candidate", "passport_front", "passport"),
        migrations.RemoveField("candidate", "passport_back"),
    ]
