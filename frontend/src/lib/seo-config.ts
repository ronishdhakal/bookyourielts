/**
 * SEO knobs the owner may want to change in one place.
 */

/**
 * A landing page (test type, month, provider, city) is indexable and listed in the sitemap only if
 * it has at least one open session OR at least this many words of unique, factual copy.
 * Otherwise it is served as noindex,follow and left out of the sitemap. Kathmandu is always indexable.
 */
export const INDEXABLE_MIN_WORDS = 300;

/** Cities that stay indexable even with no open dates. */
export const ALWAYS_INDEXABLE_CITIES = ["kathmandu"];

/** The year shown in titles ("IELTS ... 2026"). Follows the calendar, so it never goes stale. */
export const SEO_YEAR = new Date().getFullYear();

/** Short brand used as a title suffix where it fits. */
export const BRAND_SUFFIX = "BookYourIELTS";

export const DEFAULT_OG_ALT =
  "bookyourielts.com: independent IELTS booking help for students in Nepal";
