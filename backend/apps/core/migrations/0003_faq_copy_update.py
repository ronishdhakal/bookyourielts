from django.db import migrations

# WhatsApp is only the last step of a booking, so the early FAQs no longer lead with it.
UPDATES = {
    "Are you the British Council or IDP?": (
        "No. bookyourielts.com is an independent booking-assistance service. We help you find test dates, "
        "collect your details and complete your booking with you. IELTS is jointly owned by the British "
        "Council, IDP IELTS and Cambridge University Press & Assessment."
    ),
    "How does booking work?": (
        "Create a free account, choose your provider, test type, format and city, pick a date from the "
        "calendar and add your details. At the very last step we hand you to our team on WhatsApp with a "
        "ready-to-send message, and they confirm your seat and explain payment."
    ),
    "What if I cannot see a date for my city?": (
        "Send us an inquiry. Tell us your city, test type and preferred month and we will contact you as "
        "soon as new dates are released."
    ),
    "Do I pay on this website?": (
        "No. There is no online payment on bookyourielts.com. Once you confirm your booking request, our "
        "team explains the payment steps before you pay anything."
    ),
}


def apply(apps, schema_editor):
    FAQ = apps.get_model("core", "FAQ")
    for question, answer in UPDATES.items():
        FAQ.objects.filter(question=question).update(answer=answer)


class Migration(migrations.Migration):
    dependencies = [("core", "0002_initial_content")]
    operations = [migrations.RunPython(apply, migrations.RunPython.noop)]
