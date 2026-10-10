from datetime import timedelta

import pytest
from django.utils import timezone

from apps.blog.models import Post

pytestmark = pytest.mark.django_db


def make(**kw):
    data = {"title": "How to prepare", "excerpt": "Short.", "body": "Hello", "is_published": True}
    return Post.objects.create(**{**data, **kw})


def test_slug_is_generated_and_unique():
    a, b = make(), make()
    assert a.slug == "how-to-prepare"
    assert b.slug == "how-to-prepare-2"


def test_list_shows_only_published_and_not_future(api):
    make(title="Live")
    make(title="Draft", is_published=False)
    make(title="Later", published_at=timezone.now() + timedelta(days=2))
    res = api.get("/api/v1/blog/")
    assert [p["title"] for p in res.json()] == ["Live"]
    assert "body" not in res.json()[0]


def test_detail_returns_body_and_hides_drafts(api):
    p = make(body="## Hi")
    d = make(title="Secret", is_published=False)
    assert api.get(f"/api/v1/blog/{p.slug}/").json()["body"] == "## Hi"
    assert api.get(f"/api/v1/blog/{d.slug}/").status_code == 404
