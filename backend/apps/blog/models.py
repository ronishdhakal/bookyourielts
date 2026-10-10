from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Post(models.Model):
    """A blog article, written in the admin and shown at /blog/<slug>."""

    title = models.CharField(
        max_length=120, help_text="Shown as the page heading. Keep it under about 60 characters."
    )
    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
        help_text="Web address part. Filled in from the title if empty. Changing it later breaks old links.",
    )
    excerpt = models.CharField(
        max_length=300,
        help_text="One or two sentences for the list and Google description (aim for 120 to 155 characters).",
    )
    body = models.TextField(
        help_text=(
            "Plain text. Blank line = new paragraph. '## Heading' and '### Subheading' for sections, "
            "lines starting '- ' for bullets, '1. ' for numbered steps, '**bold**', and "
            "[link text](/ielts-test-dates) for links."
        )
    )
    author = models.CharField(max_length=80, default="bookyourielts.com team")
    meta_title = models.CharField(
        max_length=70,
        blank=True,
        help_text="Optional. Google title if different from the heading (under 60 characters).",
    )
    is_published = models.BooleanField(default=False, help_text="Untick to keep it as a draft.")
    published_at = models.DateTimeField(
        default=timezone.now, help_text="Shown on the post. A future date keeps it hidden until then."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-id"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:110] or "post"
            slug, n = base, 2
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)
