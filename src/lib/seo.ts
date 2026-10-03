import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, type Locale } from "./i18n/config";
import { localizeHref } from "./i18n/path";

export const SITE_NAME = "popcorn";

/** Production origin, e.g. https://popcorn.example.com (no trailing slash). Set NEXT_PUBLIC_SITE_URL. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://popcorn.example.com";
  return raw.replace(/\/+$/, "");
}

/** `/movies` -> `https://popcorn.example.com/movies`. The root is `https://popcorn.example.com/`. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL of `path` in a given language (`/movies` + `id` -> `.../id/movies`). */
export function localizedUrl(locale: Locale, path: string): string {
  return absoluteUrl(localizeHref(locale, path));
}

/**
 * Canonical + hreflang cluster for a path. Every language version points to itself as canonical and
 * lists all versions (plus x-default = English), with absolute URLs, as Google asks.
 */
export function alternatesFor(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localizedUrl(l, path);
  languages["x-default"] = localizedUrl(DEFAULT_LOCALE, path);
  return { canonical: localizedUrl(locale, path), languages };
}

interface BuildMetadataInput {
  locale: Locale;
  /** Language-neutral path of this page (`/movies`, `/movie/603`), including any query that makes it unique. */
  path: string;
  title: string;
  description?: string;
  /** Use the title as is, without the "| popcorn" template. */
  absoluteTitle?: boolean;
  type?: "website" | "video.movie" | "video.tv_show";
  /** Keep out of search results. Links on the page are still followed. */
  noindex?: boolean;
  /** Canonical points here instead of `path` (filter and sort variants share the base page). */
  canonicalPath?: string;
}

/** One place that produces title, description, canonical, hreflang, robots, Open Graph and Twitter tags. */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle,
  type = "website",
  noindex,
  canonicalPath,
}: BuildMetadataInput): Metadata {
  const canonicalTarget = canonicalPath ?? path;
  const alternates = noindex
    ? { canonical: localizedUrl(locale, canonicalTarget) }
    : alternatesFor(locale, canonicalTarget);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates,
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: localizedUrl(locale, canonicalTarget),
      locale: LOCALE_META[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_META[l].og),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Meta descriptions read best at about 155 characters; cut at a word boundary. */
export function clampDescription(text: string | null | undefined, max = 155): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).replace(/[,.;:\s]+$/, "")}…`;
}
