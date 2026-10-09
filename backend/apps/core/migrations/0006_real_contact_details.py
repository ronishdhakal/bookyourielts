from django.db import migrations

OLD_PLACEHOLDERS = {"9779800000000", "9779812345678", ""}


def set_contact_details(apps, schema_editor):
    """Replace the placeholder number, and fill blank contact details, on existing sites."""
    SiteSettings = apps.get_model("core", "SiteSettings")
    for s in SiteSettings.objects.all():
        if s.whatsapp_number in OLD_PLACEHOLDERS:
            s.whatsapp_number = "9779860688212"
        if not s.contact_phone:
            s.contact_phone = "9860688212"
        if not s.contact_email:
            s.contact_email = "bookyourielts@gmail.com"
        s.save()


class Migration(migrations.Migration):
    dependencies = [("core", "0005_general_inquiry_help_text")]
    operations = [migrations.RunPython(set_contact_details, migrations.RunPython.noop)]
