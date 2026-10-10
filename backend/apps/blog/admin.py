from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Post


@admin.register(Post)
class PostAdmin(ModelAdmin):
    list_display = ["title", "is_published", "published_at", "updated_at"]
    list_filter = ["is_published"]
    list_editable = ["is_published"]
    search_fields = ["title", "excerpt", "body"]
    date_hierarchy = "published_at"
    fieldsets = (
        ("Article", {"fields": ("title", "excerpt", "body")}),
        ("Publishing", {"fields": ("is_published", "published_at", "author")}),
        ("Search engines (optional)", {"fields": ("slug", "meta_title")}),
    )
