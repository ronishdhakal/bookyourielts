from django.db import migrations

TEST_TYPES = [
    ("academic", "IELTS Academic", False, "For university study and professional registration."),
    ("general-training", "IELTS General Training", False, "For work experience, training and migration."),
    ("ukvi-academic", "IELTS UKVI Academic", True, "Academic test approved for UK Visas and Immigration."),
    ("ukvi-general-training", "IELTS UKVI General Training", True, "General Training test approved for UKVI."),
    ("life-skills", "IELTS Life Skills", True, "Speaking and Listening test for UK visa applications (A1, A2, B1)."),
]

CITIES = [
    ("Kathmandu", "Most test dates are held here, including IELTS on computer and UKVI sessions."),
    ("Pokhara", "A convenient centre for students from Gandaki province and the western hills."),
    ("Chitwan", "Serves students from Bharatpur, Narayangarh and the surrounding Terai districts."),
    ("Butwal", "The main option for students from Lumbini province and Rupandehi."),
    ("Itahari", "Serves eastern Nepal, including Sunsari, Morang and Dhankuta."),
    ("Biratnagar", "A test city for students from Morang and nearby eastern districts."),
    ("Birtamod", "Serves Jhapa and the far eastern districts."),
    ("Banepa", "A centre for students from Kavre and the eastern Kathmandu valley."),
    ("Ghorahi", "Serves Dang and the mid-western region."),
    ("Nepalgunj", "Serves Banke and the far-western Terai."),
]


def load(apps, schema_editor):
    TestType = apps.get_model("catalog", "TestType")
    City = apps.get_model("catalog", "City")
    for i, (code, name, ukvi, desc) in enumerate(TEST_TYPES):
        TestType.objects.update_or_create(
            code=code, defaults={"name": name, "is_ukvi": ukvi, "description": desc, "order": i}
        )
    for i, (name, intro) in enumerate(CITIES):
        City.objects.update_or_create(
            slug=name.lower(), defaults={"name": name, "intro": intro, "order": i}
        )


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]
    operations = [migrations.RunPython(load, migrations.RunPython.noop)]
