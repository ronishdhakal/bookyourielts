#!/usr/bin/env node
/**
 * SEO audit. Crawls every URL in sitemap.xml on a running build and fails on SEO regressions.
 *
 *   AUDIT_BASE=http://localhost:3000 AUDIT_SITE_URL=https://www.bookyourielts.com node scripts/seo-audit.mjs
 *   add --table to print a per-page table (used for SEO_BASELINE.md / SEO_CHANGES.md)
 *
 * AUDIT_BASE      where the app is running
 * AUDIT_SITE_URL  the public origin the app was built with (NEXT_PUBLIC_SITE_URL); used to map the
 *                 absolute URLs in the sitemap and canonicals back onto AUDIT_BASE
 */

const BASE = (process.env.AUDIT_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const SITE = (process.env.AUDIT_SITE_URL ?? "https://www.bookyourielts.com").replace(/\/$/, "");
const TABLE = process.argv.includes("--table");
const MAX_TITLE = 65;
const BRAND = /bookyourielts/gi;

const failures = [];
const fail = (url, msg) => failures.push(`${url}: ${msg}`);

const local = (u) => u.replace(SITE, BASE);
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

async function get(url, init) {
  const res = await fetch(url, { redirect: "manual", ...init });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

const metaContent = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*>`, "gi");
  return [...html.matchAll(re)].map((m) => decode(/content="([^"]*)"/i.exec(m[0])?.[1] ?? ""));
};

function jsonLd(html) {
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  return blocks.map((b) => b[1]);
}

/** Collect {fee, key} from Event offers so outliers can be flagged. */
function offers(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => offers(n, out));
  else if (node && typeof node === "object") {
    if (node["@type"] === "Event" && node.offers?.price !== undefined)
      out.push({ price: Number(node.offers.price), key: node.name.replace(/,[^,]*$/, "") });
    Object.values(node).forEach((v) => offers(v, out));
  }
  return out;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function main() {
  const robots = await get(`${BASE}/robots.txt`);
  if (!/^Disallow:\s*\/portal\/\s*$/im.test(robots.text))
    fail("/robots.txt", "missing Disallow: /portal/");
  if (/^Host:/im.test(robots.text)) fail("/robots.txt", "has an ignored Host: line");

  const sm = await get(`${BASE}/sitemap.xml`);
  const entries = [...sm.text.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? "",
    lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(m[1])?.[1] ?? "",
  }));
  if (entries.length === 0) fail("/sitemap.xml", "no URLs");
  for (const e of entries) {
    if (!e.lastmod) fail(e.loc, "sitemap entry has no lastmod");
  }
  if (/<changefreq>|<priority>/.test(sm.text))
    fail("/sitemap.xml", "still lists changefreq/priority");

  const titles = new Map();
  const descriptions = new Map();
  const allOffers = [];
  const linkSet = new Set();
  const rows = [];

  for (const { loc } of entries) {
    const url = local(loc);
    const page = await get(url);
    if (page.status !== 200) {
      fail(loc, `status ${page.status}`);
      continue;
    }
    const html = page.text;

    const title = decode(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? "").trim();
    if (!title) fail(loc, "missing <title>");
    if (title.length > MAX_TITLE) fail(loc, `title is ${title.length} chars: "${title}"`);
    if ((title.match(BRAND) ?? []).length > 1) fail(loc, `brand repeated in title: "${title}"`);
    if (titles.has(title)) fail(loc, `duplicate title also on ${titles.get(title)}`);
    titles.set(title, loc);

    const [desc] = metaContent(html, "name", "description");
    if (!desc) fail(loc, "missing meta description");
    else if (descriptions.has(desc))
      fail(loc, `duplicate description also on ${descriptions.get(desc)}`);
    else descriptions.set(desc, loc);
    if (desc && (desc.length < 70 || desc.length > 160))
      fail(loc, `description is ${desc.length} chars`);

    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) fail(loc, `${h1} <h1> elements`);

    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    if (!canonical) fail(loc, "missing canonical");
    else if (canonical.replace(/\/$/, "") !== loc.replace(/\/$/, ""))
      fail(loc, `canonical is ${canonical}`);

    const robotsMeta = metaContent(html, "name", "robots").join(",");
    if (/noindex/i.test(robotsMeta)) fail(loc, "noindex page is listed in the sitemap");

    if (metaContent(html, "property", "og:image").length === 0) fail(loc, "missing og:image");
    if (metaContent(html, "name", "twitter:image").length === 0) fail(loc, "missing twitter:image");

    const types = [];
    for (const raw of jsonLd(html)) {
      try {
        const data = JSON.parse(raw);
        for (const d of Array.isArray(data) ? data : [data]) types.push(d["@type"]);
        allOffers.push(...offers(data));
      } catch {
        fail(loc, "JSON-LD does not parse");
      }
    }

    for (const m of html.matchAll(/<a [^>]*href="([^"#]+)"/g)) {
      const href = decode(m[1]);
      if (/^(mailto:|tel:|https?:\/\/(?!localhost))/.test(href) && !href.startsWith(SITE)) continue;
      const path = href.replace(SITE, "").replace(BASE, "");
      if (!path.startsWith("/") || /^\/(portal|api|admin)(\/|$)/.test(path)) continue;
      linkSet.add(path.split("#")[0]);
    }

    const text = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ");
    rows.push({
      path: loc.replace(SITE, "") || "/",
      title: title.length,
      desc: desc?.length ?? 0,
      h1,
      jsonld: [...new Set(types)].join(", "),
      words: text.split(/\s+/).filter(Boolean).length,
      links: (html.match(/<a [^>]*href=/g) ?? []).length,
    });
  }

  // Outlier prices: more than 3x or less than 1/3 of the median for the same test and format.
  const byKey = new Map();
  for (const o of allOffers) byKey.set(o.key, [...(byKey.get(o.key) ?? []), o.price]);
  for (const [key, prices] of byKey) {
    const med = median(prices);
    for (const p of new Set(prices))
      if (p > med * 3 || p < med / 3)
        fail("JSON-LD", `outlier price ${p} for "${key}" (median ${med})`);
  }

  // Internal links must resolve to 200.
  for (const path of linkSet) {
    const r = await get(`${BASE}${path}`);
    if (r.status !== 200) fail(path, `internal link returns ${r.status}`);
  }

  // Unknown slugs must be real 404s.
  for (const path of ["/ielts-test-dates/not-a-city", "/ielts-test-dates/january-1999"]) {
    const r = await get(`${BASE}${path}`);
    if (r.status !== 404) fail(path, `expected 404, got ${r.status}`);
  }

  if (TABLE) {
    console.log(
      "| Path | Title | Desc | H1 | JSON-LD | Words | Links |\n|---|---|---|---|---|---|---|",
    );
    for (const r of rows)
      console.log(
        `| ${r.path} | ${r.title} | ${r.desc} | ${r.h1} | ${r.jsonld} | ${r.words} | ${r.links} |`,
      );
  }
  console.log(`Audited ${rows.length} sitemap URLs and ${linkSet.size} internal links.`);
  if (failures.length) {
    console.error(`\n${failures.length} SEO problem(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("SEO audit passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
