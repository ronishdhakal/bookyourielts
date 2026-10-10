# SEO open questions (owner)

Nothing below is invented on the site. Where a fact is unknown the page says less, or "Ask us".

## Fees and money

1. **Service charge.** What does bookyourielts.com charge, if anything? Today the fee page and FAQ say "our team tells
   you exactly what is included before you pay". To publish the real answer, add a content block with the key
   `service-charge` in the admin; it then appears in the "Our service charge" section and the FAQ.
   `TODO(owner)` in `frontend/src/app/(site)/ielts-fee-nepal/page.tsx`.
2. **Fee for tests with no open date.** The fee table shows "Ask us" for General Training, UKVI Academic, UKVI General
   Training, Life Skills and every Writing on Paper row when no such date is open. Give the fees (or add a fee master in
   the admin) to show them all the time. There is no fee master table today; fees come only from open dates.
3. **Session 2 (17 Oct 2026, Kathmandu, Academic)** shows NPR 3,55,000; expected NPR 35,500. Left for you to fix in the
   admin, as agreed.

## Policies

4. **Refund, transfer and cancellation rules.** The site only says the provider sets them and they depend on how
   close the test date is. If you have concrete rules (deadlines, fees, what you handle), add them to the
   "Changes, cancellations and refunds" content block (`cancellation-refund`) and the guide uses them automatically.
5. **Official provider pages.** Only ielts.org is linked. Send the exact British Council Nepal and IDP Nepal URLs you
   want linked as official references (fee, registration, policies).

## City facts (for thin city pages)

6. **Venue names and addresses** per city. Venues are assigned after booking, so no page names one.
7. **Nearest alternative cities and travel notes.** The "cities with open dates" module lists cities by availability,
   not by distance, because no distance data exists.
8. Any city intro beyond the one-line admin intro. Cities with no dates stay `noindex` until they have about 300
   words of unique text or an open date (setting: `INDEXABLE_MIN_WORDS` in `frontend/src/lib/seo-config.ts`).

## Content not written

9. **British Council vs IDP in Nepal.** Not written: there are no verified differences on the site or in the data, and
   inventing them would break the no-made-up-facts rule. Send the facts you can stand behind and it can be added.
10. **Guide length.** The five guides are roughly 300 to 450 words of body copy, well under the 600-900 target, because that is what the
    site's own verified facts support. Longer text needs more facts from you.

## Search Console

11. Verify the site in Google Search Console and Bing Webmaster Tools, submit `sitemap.xml`, and request indexing for
    the fee, dates and booking pages after deploy.
