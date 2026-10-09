import csv

from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from unfold.admin import ModelAdmin

from .models import FAQ, ContentBlock, SiteSettings


def export_csv(modeladmin, queryset, fields: list[str], filename: str) -> HttpResponse:
    """Stream a queryset as CSV. `fields` are attribute or callable names on the model/admin."""
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
    response.write("﻿")  # BOM so Excel reads UTF-8 correctly
    writer = csv.writer(response)
    writer.writerow(fields)
    for obj in queryset:
        row = []
        for f in fields:
            value = getattr(modeladmin, f)(obj) if hasattr(modeladmin, f) else getattr(obj, f, "")
            if callable(value):
                value = value()
            row.append(str(value) if value is not None else "")
        writer.writerow(row)
    return response


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    fieldsets = (
        ("WhatsApp", {"fields": ("whatsapp_number", "booking_message_template", "inquiry_message_template")}),
        ("Contact details", {"fields": ("contact_email", "contact_phone", "office_address")}),
        ("Seat display", {"fields": ("low_seat_threshold",)}),
        ("Site-wide text", {"fields": ("announcement", "footer_disclaimer")}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        SiteSettings.load()
        return redirect(reverse("admin:core_sitesettings_change", args=[1]))


@admin.register(FAQ)
class FAQAdmin(ModelAdmin):
    list_display = ["question", "page", "order", "is_active"]
    list_filter = ["page", "is_active"]
    list_editable = ["order", "is_active"]
    search_fields = ["question", "answer"]


@admin.register(ContentBlock)
class ContentBlockAdmin(ModelAdmin):
    list_display = ["title", "key", "updated_at"]
    search_fields = ["title", "body"]
    readonly_fields = ["updated_at"]
