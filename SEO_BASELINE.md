# SEO baseline (before the overhaul)

Measured on `main` (commit b067f5e) with `frontend/scripts/seo-audit.mjs`, built locally against a dev API with
demo data limited to Kathmandu + British Council (what production has). Lengths are characters; "Words" and
"Links" are for the rendered page.

Not measured here (need the live site or a real browser): `X-Robots-Tag` headers, Lighthouse and Core Web Vitals.
The nginx config in `deploy/nginx/bookyourielts.conf` already 301s the bare domain and http to
`https://www.bookyourielts.com` in one hop, and `<html lang="en">` is set in `app/layout.tsx`. Unknown city slugs
return a real 404.

Every page already had a canonical, one H1, and Organization + BreadcrumbList JSON-LD (FAQPage on FAQ pages, Event
on pages with dates), so the audit note that structured data was "not visible" was a limit of crawling from outside,
not a gap in the code. What was missing is listed below.

## Audit result: 65 problems

- Titles: home 88 chars with the brand twice; 14 more titles over 65 chars (the layout appended " | bookyourielts.com").
- Descriptions over 160 chars on `/ielts-test-dates` (172) and `/ielts-fee-nepal` (162).
- No `og:image` / `twitter:image` on any of the 21 pages (42 findings).
- `robots.txt` missing `Disallow: /portal/` and still had `Host:`; sitemap still carried changefreq/priority.

## Per-page table

| Path | Title | Desc | H1 | JSON-LD | Words | Links |
|---|---|---|---|---|---|---|
| / | 88 | 152 | 1 | FAQPage, Organization | 1046 | 54 |
| /ielts-booking-nepal | 70 | 145 | 1 | BreadcrumbList, FAQPage, Organization | 1090 | 40 |
| /ielts-test-dates | 71 | 172 | 1 | BreadcrumbList, Event, Organization | 1534 | 74 |
| /ielts-fee-nepal | 70 | 162 | 1 | BreadcrumbList, FAQPage, Organization | 461 | 26 |
| /ielts-on-computer-nepal | 73 | 149 | 1 | BreadcrumbList, FAQPage, Organization | 609 | 27 |
| /ielts-academic-vs-general-training | 78 | 147 | 1 | BreadcrumbList, FAQPage, Organization | 554 | 27 |
| /inquire | 54 | 103 | 1 | BreadcrumbList, Organization | 229 | 23 |
| /about | 43 | 122 | 1 | BreadcrumbList, Organization | 335 | 27 |
| /contact | 30 | 91 | 1 | BreadcrumbList, Organization | 215 | 27 |
| /privacy | 34 | 76 | 1 | BreadcrumbList, Organization | 441 | 24 |
| /terms | 32 | 96 | 1 | BreadcrumbList, Organization | 413 | 24 |
| /ielts-test-dates/kathmandu | 72 | 135 | 1 | BreadcrumbList, Event, FAQPage, Organization | 1699 | 78 |
| /ielts-test-dates/pokhara | 70 | 131 | 1 | BreadcrumbList, FAQPage, Organization | 503 | 31 |
| /ielts-test-dates/chitwan | 70 | 131 | 1 | BreadcrumbList, FAQPage, Organization | 501 | 31 |
| /ielts-test-dates/butwal | 69 | 129 | 1 | BreadcrumbList, FAQPage, Organization | 501 | 31 |
| /ielts-test-dates/itahari | 70 | 131 | 1 | BreadcrumbList, FAQPage, Organization | 499 | 31 |
| /ielts-test-dates/biratnagar | 73 | 137 | 1 | BreadcrumbList, FAQPage, Organization | 502 | 31 |
| /ielts-test-dates/birtamod | 71 | 133 | 1 | BreadcrumbList, FAQPage, Organization | 498 | 31 |
| /ielts-test-dates/banepa | 69 | 129 | 1 | BreadcrumbList, FAQPage, Organization | 502 | 31 |
| /ielts-test-dates/ghorahi | 70 | 131 | 1 | BreadcrumbList, FAQPage, Organization | 497 | 31 |
| /ielts-test-dates/nepalgunj | 72 | 135 | 1 | BreadcrumbList, FAQPage, Organization | 497 | 31 |
