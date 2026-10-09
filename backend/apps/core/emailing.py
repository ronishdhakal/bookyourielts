"""Branded HTML emails (with a plain-text twin) for everything the site sends.

The layout is table based with inline styles, because mail apps ignore most modern CSS.
Brand red is #c80530, text is near-black #1d2127, and the page is a soft grey."""

import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

log = logging.getLogger(__name__)

RED = "#c80530"
INK = "#1d2127"
MUTED = "#5b6470"
LINE = "#e3e6ea"
BG = "#f1f3f5"
DISCLAIMER = (
    "bookyourielts.com is an independent booking assistance service. It is not affiliated with, "
    "endorsed by or an agent of the British Council, IDP or Cambridge University Press & Assessment."
)


def _site() -> str:
    return settings.FRONTEND_URL.rstrip("/")


def render_email(
    *,
    heading: str,
    paragraphs: list[str],
    details: list[tuple[str, str]] | None = None,
    button: tuple[str, str] | None = None,
    preheader: str = "",
    footnote: str = "",
) -> tuple[str, str]:
    """Return (html, text). `paragraphs` and `details` are plain text; they are escaped here."""
    site = _site()
    body = "".join(
        f'<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{INK};">{escape(p)}</p>'
        for p in paragraphs
    )
    rows = ""
    if details:
        cells = "".join(
            f'<tr><td style="padding:10px 14px;font-size:13px;color:{MUTED};width:38%;'
            f'border-bottom:1px solid {LINE};">{escape(k)}</td>'
            f'<td style="padding:10px 14px;font-size:15px;font-weight:600;color:{INK};'
            f'border-bottom:1px solid {LINE};">{escape(v)}</td></tr>'
            for k, v in details
            if v
        )
        rows = (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:8px 0 24px;border:1px solid {LINE};border-radius:8px;border-collapse:separate;'
            f'background:#fafbfc;">{cells}</table>'
        )
    cta = ""
    if button:
        label, url = button
        cta = (
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>'
            f'<td style="background:{RED};border-radius:8px;">'
            f'<a href="{escape(url)}" style="display:inline-block;padding:14px 28px;font-size:16px;'
            f'font-weight:700;color:#ffffff;text-decoration:none;">{escape(label)}</a></td></tr></table>'
            f'<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:{MUTED};">'
            f"If the button does not work, copy this link into your browser:<br>"
            f'<a href="{escape(url)}" style="color:{RED};word-break:break-all;">{escape(url)}</a></p>'
        )
    note = (
        f'<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:{MUTED};">{escape(footnote)}</p>'
        if footnote
        else ""
    )
    hidden = (
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>'
        if preheader
        else ""
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(heading)}</title></head>
<body style="margin:0;padding:0;background:{BG};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
{hidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid {LINE};">
    <tr><td style="height:6px;background:{RED};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:24px 32px 8px;">
      <a href="{site}" style="text-decoration:none;"><img src="{site}/static/logo.png" height="40" alt="bookyourielts.com" style="display:block;height:40px;border:0;color:{RED};font-size:20px;font-weight:700;"></a>
    </td></tr>
    <tr><td style="padding:16px 32px 8px;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:{INK};">{escape(heading)}</h1>
      {body}{rows}{cta}{note}
    </td></tr>
    <tr><td style="padding:20px 32px 28px;border-top:1px solid {LINE};">
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:{MUTED};">
        Questions? Email <a href="mailto:bookyourielts@gmail.com" style="color:{RED};">bookyourielts@gmail.com</a>
        or call <a href="tel:+9779860688212" style="color:{RED};">9860688212</a>.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#8a919b;">{escape(DISCLAIMER)}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""

    lines = [heading, "", *[line for p in paragraphs for line in (p, "")]]
    if details:
        lines += [f"{k}: {v}" for k, v in details if v] + [""]
    if button:
        lines += [f"{button[0]}: {button[1]}", ""]
    if footnote:
        lines += [footnote, ""]
    lines += [
        "Questions? bookyourielts@gmail.com or 9860688212.",
        DISCLAIMER,
    ]
    return html, "\n".join(lines)


def send_branded(to: list[str], subject: str, **content) -> None:
    """Send one branded email. Raises on SMTP errors; callers decide whether that matters."""
    html, text = render_email(**content)
    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, to)
    msg.attach_alternative(html, "text/html")
    msg.send()
