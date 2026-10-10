# SEO changes (after)

Branch `seo/overhaul`. Same audit, same dev data (Kathmandu + British Council only), built from this branch:
**24 sitemap URLs, 44 internal links, 0 problems** (was 21 URLs and 65 problems; see SEO_BASELINE.md).

| | Before | After |
|---|---|---|
| Audit problems | 65 | 0 |
| Titles over 65 chars | 15 | 0 (max 60) |
| Brand repeated in a title | 2 (home, About) | 0 |
| `og:image` / `twitter:image` | 0 of 21 pages | every page (1200x630 brand card) |
| `robots.txt` blocks `/portal/` | no | yes (`Host:` removed) |
| Sitemap | one `lastmod` for all URLs, changefreq/priority, all 10 cities | real per-URL `lastmod`, only indexable URLs, cities without dates left out |
| Landing pages | none | 4 test-type, month, provider (only when dates exist) |
| Guides | 0 | 5 |
| Dates rendered per row | 2 (table + list) | 1 |

## What changed, by concern

1. **Titles and social images** (`lib/seo.ts`, `app/layout.tsx`, `app/opengraph-image.tsx`): one brand suffix at most,
   added only when it fits in 60 characters. Titles carry the year (follows the calendar, `SEO_YEAR`).
2. **Crawl and freshness**: `/portal/` and `/revalidate` disallowed; "Book this date" links are `rel="nofollow"` with
   an aria-label such as "Book IELTS Academic in Kathmandu on 16 Oct 2026". The sitemap is generated from data with a
   per-URL `lastmod` (newest `updated_at` among the sessions on that page); `updated_at` is now in the public sessions
   API. Date and fee fetches revalidate every 10 minutes, and Django calls `POST /revalidate` on any change to
   sessions, cities, test types, FAQs, content or settings (needs `REVALIDATE_URL` + `REVALIDATE_SECRET`, see below).
3. **Dates page** (`/ielts-test-dates`): intro from live data, "Last updated", month and test-type links, filter URLs
   canonicalise to the clean URL, `?page=N` is self-canonical, filtered URLs are no longer `noindex`.
4. **Landing pages**: `/ielts-academic-test-dates-nepal`, `/ielts-general-training-test-dates-nepal`,
   `/ielts-ukvi-nepal`, `/ielts-life-skills-nepal`, `/ielts-test-dates/<month>-<year>`,
   `/ielts-test-dates/british-council`, `/ielts-test-dates/idp`. Indexability rule in `lib/seo-config.ts`
   (`INDEXABLE_MIN_WORDS`): open session, or about 300 words of unique copy, otherwise `noindex,follow` and out of the
   sitemap. Kathmandu is always indexable. Month and provider pages 404 when they have no sessions; unknown slugs 404.
5. **City pages**: copy built from the admin intro and live inventory, FAQs that change with inventory, a module linking
   to cities that have open dates, an inquiry link when a city has none.
6. **Fee page** rebuilt around a stable table (every test type x format; "Ask us" when no date is open, "Not offered"
   for UKVI with Writing on Paper), "Fees last verified", a service-charge section, and a visible FAQ matching the schema.
7. **Homepage**: honest stats (open dates, cities with open dates, providers with open dates), a fee snapshot linking
   to the fee page, live price and date FAQs, and test types link to the new landing pages instead of `?test_type=` URLs.
8. **Booking guide** is now the how-to ("How to Book IELTS in Nepal 2026") and links to the guides.
9. **Guides**: registration deadline, cancellation and refund, results date, documents, test cities.
10. **Footer** links all cities, test types and guides. Breadcrumbs (visible + BreadcrumbList) were already on every page.
11. **Structured data**: Events are now one `ItemList` per page with organizer, date-only start, city-level location and
    numeric price; `WebSite` on the home page; `WebPage` with `dateModified` on dates, fee and landing pages.
12. **Audit script** `frontend/scripts/seo-audit.mjs`, run in CI after the build.

## Not changed on purpose

- The NPR 3,55,000 fee on session 2 is left for you to fix in the admin panel, as agreed. The audit script flags an
  outlier price (more than 3x or under 1/3 of the median for the same test) in the page JSON-LD, so a repeat shows up
  there. There is no backend validation or frontend guard for it.
- No provider URLs other than ielts.org are linked; see SEO_OPEN_QUESTIONS.md.

## Per-page table after

| Path | Title | Desc | H1 | JSON-LD | Words | Links |
|---|---|---|---|---|---|---|
| / | 48 | 118 | 1 | FAQPage, WebSite, Organization | 1108 | 67 |
| /ielts-test-dates | 60 | 143 | 1 | BreadcrumbList, ItemList, WebPage, Organization | 1090 | 77 |
| /ielts-fee-nepal | 49 | 154 | 1 | BreadcrumbList, WebPage, FAQPage, Organization | 910 | 49 |
| /ielts-booking-nepal | 51 | 134 | 1 | BreadcrumbList, FAQPage, Organization | 1179 | 63 |
| /ielts-on-computer-nepal | 53 | 149 | 1 | BreadcrumbList, FAQPage, Organization | 674 | 45 |
| /ielts-academic-vs-general-training | 58 | 147 | 1 | BreadcrumbList, FAQPage, Organization | 619 | 45 |
| /ielts-registration-deadline-nepal | 57 | 154 | 1 | BreadcrumbList, FAQPage, Organization | 574 | 48 |
| /ielts-cancellation-refund-nepal | 46 | 148 | 1 | BreadcrumbList, FAQPage, Organization | 536 | 46 |
| /ielts-results-date-nepal | 54 | 148 | 1 | BreadcrumbList, FAQPage, Organization | 508 | 46 |
| /documents-required-for-ielts-nepal | 52 | 159 | 1 | BreadcrumbList, FAQPage, Organization | 484 | 46 |
| /ielts-test-centres-nepal | 54 | 139 | 1 | BreadcrumbList, FAQPage, Organization | 506 | 56 |
| /inquire | 50 | 103 | 1 | BreadcrumbList, Organization | 296 | 41 |
| /about | 23 | 122 | 1 | BreadcrumbList, Organization | 400 | 45 |
| /contact | 26 | 91 | 1 | BreadcrumbList, Organization | 282 | 45 |
| /privacy | 30 | 76 | 1 | BreadcrumbList, Organization | 508 | 42 |
| /terms | 28 | 96 | 1 | BreadcrumbList, Organization | 480 | 42 |
| /ielts-test-dates/kathmandu | 48 | 148 | 1 | BreadcrumbList, ItemList, FAQPage, Organization | 1159 | 72 |
| /ielts-academic-test-dates-nepal | 48 | 115 | 1 | BreadcrumbList, ItemList, FAQPage, WebPage, Organization | 947 | 71 |
| /ielts-ukvi-nepal | 60 | 110 | 1 | BreadcrumbList, ItemList, FAQPage, WebPage, Organization | 783 | 64 |
| /ielts-life-skills-nepal | 51 | 116 | 1 | BreadcrumbList, ItemList, FAQPage, WebPage, Organization | 576 | 53 |
| /ielts-test-dates/october-2026 | 48 | 100 | 1 | BreadcrumbList, ItemList, WebPage, Organization | 545 | 56 |
| /ielts-test-dates/november-2026 | 49 | 102 | 1 | BreadcrumbList, ItemList, WebPage, Organization | 781 | 67 |
| /ielts-test-dates/december-2026 | 49 | 101 | 1 | BreadcrumbList, ItemList, WebPage, Organization | 629 | 60 |
| /ielts-test-dates/british-council | 47 | 129 | 1 | BreadcrumbList, ItemList, WebPage, Organization | 954 | 76 |
