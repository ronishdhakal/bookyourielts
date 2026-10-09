from django.db import migrations

FAQS = [
    # (page, question, answer)
    ("general", "Are you the British Council or IDP?",
     "No. bookyourielts.com is an independent booking-assistance service. We help you find test dates and "
     "complete your booking with us on WhatsApp. IELTS is jointly owned by the British Council, IDP IELTS and "
     "Cambridge University Press & Assessment."),
    ("general", "How does booking work?",
     "Create a free account, choose a date that suits you and tap Book via WhatsApp. Your details are filled in "
     "for you, so you only need to press send. We reply on WhatsApp and take you through the rest."),
    ("general", "What if I cannot see a date for my city?",
     "Send us an inquiry. Tell us your city, test type and preferred month and we will message you as soon as "
     "new dates are released."),
    ("booking", "Do I pay on this website?",
     "No. There is no online payment on bookyourielts.com. Once you message us on WhatsApp, we explain the "
     "payment steps for your booking."),
    ("booking", "When does registration close?",
     "Registration usually closes about six days before the test date. Each date on our schedule shows its own "
     "closing date, and closed dates cannot be booked."),
    ("booking", "When is my Speaking test?",
     "Listening, Reading and Writing are held on the same day. The Speaking test is a separate slot, usually "
     "within about seven days before or after your main test day. You will be told your Speaking time after "
     "your booking is confirmed."),
    ("booking", "Can I change or cancel my booking?",
     "Message us on WhatsApp as early as you can and quote your reference number. Rules on changes and refunds "
     "are set by the test provider and depend on how close the test date is."),
    ("fees", "How much does IELTS cost in Nepal?",
     "The fee depends on the test type and format, and it can change. The fee for each date is shown on our "
     "schedule in Nepali rupees."),
    ("fees", "Is there a service charge?",
     "Our team will tell you exactly what is included before you pay anything. Ask us on WhatsApp if you want "
     "the details."),
    ("computer", "What is IELTS on computer?",
     "The same IELTS test, taken on a computer for Listening, Reading and Writing. The Speaking test is still a "
     "face-to-face conversation with an examiner. Results usually arrive faster than with paper tests."),
    ("computer", "What is Computer-delivered with Writing on Paper?",
     "You take Listening and Reading on a computer, but handwrite your Writing answers. It is available at fewer "
     "centres and is not available for UKVI tests."),
    ("computer", "How soon are results ready?",
     "Computer-delivered results are usually ready in about three to five days. Writing on Paper takes longer, "
     "usually around thirteen days."),
    ("modules", "Should I take Academic or General Training?",
     "Take Academic for university study or professional registration. Take General Training for work "
     "experience, training programmes or migration to countries such as Canada, Australia and New Zealand. "
     "Always check what your university or immigration authority requires."),
    ("modules", "What is IELTS UKVI?",
     "IELTS UKVI is taken for UK visa and immigration purposes. It is the same test content, delivered under "
     "UKVI conditions. If you need it for a visa, make sure you book a UKVI session."),
]

BLOCKS = [
    ("what-to-bring", "What to bring on test day",
     "- Your original passport (the same one you used to register)\n"
     "- Your booking confirmation\n"
     "- A water bottle without a label\n\n"
     "Leave bags, phones, watches and notes outside the test room. You will be asked to store them before you enter."),
    ("cancellation-refund", "Changes, cancellations and refunds",
     "Rules for changing or cancelling a booking are set by the IELTS test provider. In general, the earlier you tell us, "
     "the more options you have.\n\n"
     "To change or cancel, message us on WhatsApp and quote your booking reference."),
    ("test-day", "How the test day works",
     "Listening, Reading and Writing are taken on the same day, one after another, in about two hours and forty-five minutes.\n\n"
     "The Speaking test is a separate, short face-to-face interview, usually within about seven days before or after your test day."),
]


def load(apps, schema_editor):
    FAQ = apps.get_model("core", "FAQ")
    ContentBlock = apps.get_model("core", "ContentBlock")
    SiteSettings = apps.get_model("core", "SiteSettings")
    import os

    SiteSettings.objects.get_or_create(pk=1, defaults={"whatsapp_number": os.environ.get("ADMIN_WHATSAPP_NUMBER", "9779800000000")})
    for i, (page, q, a) in enumerate(FAQS):
        FAQ.objects.get_or_create(question=q, defaults={"page": page, "answer": a, "order": i})
    for key, title, body in BLOCKS:
        ContentBlock.objects.get_or_create(key=key, defaults={"title": title, "body": body})


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [migrations.RunPython(load, migrations.RunPython.noop)]
