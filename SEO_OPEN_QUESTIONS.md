# SEO open questions (owner)

Nothing below is invented on the site. Where a fact is unknown the page says less, or "Ask us".

## Fees and money

1. ~~Service charge~~ Answered: free, possibly with a discount on the original price. Now on the fee page (`lib/policy.ts`).
2. ~~Fee for tests with no open date~~ Answered: the table keeps showing "Ask us".
3. ~~Session 2 fee~~ Fixed by the owner.

## Policies

4. ~~Refund rules~~ Answered: refund only if we cannot book the requested date. Now on the fee and cancellation pages (`lib/policy.ts`).
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
