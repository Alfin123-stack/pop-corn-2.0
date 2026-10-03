import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

const PREFIX = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

/** `/id/movies` -> `/movies`. Paths without a language prefix are returned unchanged. */
export function stripLocale(pathname: string): string {
  const stripped = pathname.replace(PREFIX, "");
  return stripped === "" ? "/" : stripped;
}

/**
 * Prefixes an internal path with the language segment. English stays unprefixed.
 * Query strings and hashes are preserved; external and hash-only links are left alone.
 */
export function localizeHref(locale: Locale, href: string): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/") return `/${locale}`;
  if (href.startsWith("/?") || href.startsWith("/#")) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}
