"""Tell the Next.js site to refresh its cached pages when public data changes.

Set REVALIDATE_URL (for example https://www.bookyourielts.com/revalidate) and REVALIDATE_SECRET
(the same value the frontend has) to turn it on. Without them nothing happens, so local development
and tests are unaffected. The call is best effort: a failure is logged and never blocks an admin save.
"""

import logging
import threading
import urllib.request

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.blog.models import Post
from apps.catalog.models import City, TestSession, TestType

from .models import FAQ, ContentBlock, SiteSettings

log = logging.getLogger(__name__)

WATCHED = (TestSession, City, TestType, FAQ, ContentBlock, SiteSettings, Post)


def _post(url: str, secret: str) -> None:
    req = urllib.request.Request(url, method="POST", headers={"X-Revalidate-Secret": secret})
    try:
        with urllib.request.urlopen(req, timeout=5):  # noqa: S310  (operator-configured https URL)
            pass
    except Exception:  # best effort
        log.warning("Site revalidation call failed", exc_info=True)


def ping_site() -> None:
    url = getattr(settings, "REVALIDATE_URL", "")
    secret = getattr(settings, "REVALIDATE_SECRET", "")
    if url and secret:
        threading.Thread(target=_post, args=(url, secret), daemon=True).start()


def _schedule(**_kwargs) -> None:
    if getattr(settings, "REVALIDATE_URL", ""):
        transaction.on_commit(ping_site)


for _model in WATCHED:
    receiver(post_save, sender=_model, weak=False)(_schedule)
    receiver(post_delete, sender=_model, weak=False)(_schedule)
