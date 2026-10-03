#!/usr/bin/env node
/**
 * SEO smoke test. Start the site (`npm run build && npm start`), then:
 *   SITE=http://localhost:3000 node scripts/check-seo.mjs
 * It fetches representative pages in both languages and checks what the rendered HTML promises crawlers:
 * one h1, an absolute self-referencing canonical, a reciprocal hreflang cluster with x-default, the right
 * robots meta, Open Graph and Twitter tags, and JSON-LD that parses. It does not replace Google's
 * Rich Results Test or Search Console.
 */
const SITE = (process.env.SITE ?? "http://localhost:3000").replace(/\/+$/, "");
const ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://popcorn.example.com").replace(/\/+$/, "");
const MOVIE_ID = process.env.MOVIE_ID ?? "603";
const TV_ID = process.env.TV_ID ?? "1396";

const pages = [
  { path: "/", index: true, jsonld: ["WebSite", "ItemList"] },
  { path: "/movies", index: true, jsonld: ["ItemList"] },
  { path: "/tv", index: true, jsonld: ["ItemList"] },
  { path: "/movies/genre/action", index: true, jsonld: ["ItemList", "BreadcrumbList"] },
  { path: "/tv/genre/drama", index: true, jsonld: ["ItemList", "BreadcrumbList"] },
  { path: `/movie/${MOVIE_ID}`, index: true, jsonld: ["Movie", "BreadcrumbList"] },
  { path: `/tv/${TV_ID}`, index: true, jsonld: ["TVSeries", "BreadcrumbList"] },
  { path: "/movies?page=2", index: false },
  { path: "/search?q=matrix", index: false },
  { path: "/watched", index: false },
];

const prefix = (lang, path) => (lang === "en" ? path : path === "/" ? "/id" : `/id${path}`);
let failures = 0;
const fail = (url, msg) => {
  failures++;
  console.log(`  FAIL ${url}: ${msg}`);
};

const attr = (tag, name) => new RegExp(`${name}=["']([^"']*)["']`, "i").exec(tag)?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];

async function check(lang, page) {
  const path = prefix(lang, page.path);
  const url = SITE + path;
  const res = await fetch(url, { redirect: "manual" });
  if (res.status !== 200) return fail(url, `status ${res.status}`);
  const html = await res.text();

  const htmlLang = /<html[^>]*\blang=["']([^"']+)/i.exec(html)?.[1];
  if (htmlLang !== lang) fail(url, `<html lang> is ${htmlLang}, expected ${lang}`);

  const h1s = (html.match(/<h1\b/gi) ?? []).length;
  if (h1s !== 1) fail(url, `${h1s} <h1> elements, expected 1`);

  if (!/<title>[^<]+<\/title>/i.test(html)) fail(url, "missing <title>");
  if (page.index && !/<meta[^>]+name=["']description["']/i.test(html)) fail(url, "missing meta description");

  const robots = tags(html, "meta").find((t) => attr(t, "name") === "robots");
  if (page.index && robots && /noindex/i.test(robots)) fail(url, "indexable page has noindex");
  if (!page.index && !(robots && /noindex/i.test(robots))) fail(url, "should be noindex");

  const links = tags(html, "link");
  const canonical = links.find((t) => attr(t, "rel") === "canonical");
  const canonicalHref = canonical && attr(canonical, "href");
  if (!canonicalHref) fail(url, "missing canonical");
  else if (!canonicalHref.startsWith(ORIGIN)) fail(url, `canonical is not on ${ORIGIN}: ${canonicalHref}`);
  else if (page.index && canonicalHref !== ORIGIN + path.replace(/^\/$/, "/")) {
    fail(url, `canonical ${canonicalHref} is not self-referencing`);
  }

  if (page.index) {
    const alt = Object.fromEntries(
      links.filter((t) => attr(t, "rel") === "alternate" && attr(t, "hreflang")).map((t) => [attr(t, "hreflang"), attr(t, "href")]),
    );
    for (const l of ["en", "id", "x-default"]) if (!alt[l]) fail(url, `missing hreflang ${l}`);
    if (alt.en !== ORIGIN + prefix("en", page.path) || alt.id !== ORIGIN + prefix("id", page.path)) {
      fail(url, `hreflang cluster does not match ${page.path}: ${JSON.stringify(alt)}`);
    }
    if (alt["x-default"] !== alt.en) fail(url, "x-default should point at the English URL");
    const og = tags(html, "meta").filter((t) => (attr(t, "property") ?? "").startsWith("og:")).map((t) => attr(t, "property"));
    for (const p of ["og:title", "og:url", "og:type", "og:image"]) if (!og.includes(p)) fail(url, `missing ${p}`);
    const tw = tags(html, "meta").filter((t) => (attr(t, "name") ?? "").startsWith("twitter:")).map((t) => attr(t, "name"));
    if (!tw.includes("twitter:card")) fail(url, "missing twitter:card");
  }

  const types = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      for (const d of Array.isArray(data) ? data : [data]) types.push(d["@type"]);
    } catch {
      fail(url, "JSON-LD does not parse");
    }
  }
  for (const want of page.jsonld ?? []) if (!types.includes(want)) fail(url, `missing JSON-LD ${want} (found: ${types.join(", ") || "none"})`);

  if (failures === 0 || true) console.log(`  ok   ${path}`);
}

for (const lang of ["en", "id"]) {
  console.log(`\n[${lang}]`);
  for (const page of pages) {
    try {
      await check(lang, page);
    } catch (err) {
      fail(SITE + prefix(lang, page.path), String(err));
    }
  }
}

// robots.txt and sitemap
for (const file of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
  const res = await fetch(SITE + file);
  console.log(`\n${file}: ${res.status}`);
  if (res.status !== 200) fail(SITE + file, `status ${res.status}`);
}
const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap: ${urls.length} URLs`);
for (const u of urls.slice(0, 30)) {
  const res = await fetch(u.replace(ORIGIN, SITE), { redirect: "manual" });
  if (res.status !== 200) fail(u, `sitemap URL answers ${res.status}`);
}

console.log(failures ? `\n${failures} problem(s) found` : "\nall checks passed");
process.exit(failures ? 1 : 0);
