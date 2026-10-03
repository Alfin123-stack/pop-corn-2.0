export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

/** English lives at the site root (`/movies`); every other language gets a prefix (`/id/movies`). */
export const DEFAULT_LOCALE: Locale = "en";

/** localStorage flag: the visitor dismissed (or used) the "view in another language" suggestion. */
export const LANG_BANNER_KEY = "popcorn-lang-banner";
/** sessionStorage flag: a language switch is in flight, so the new page plays its entrance. */
export const LANG_SWITCH_KEY = "popcorn-lang-entering";

export const LOCALE_META: Record<Locale, { label: string; native: string; intl: string; tmdb: string; og: string }> = {
  en: { label: "EN", native: "English", intl: "en-US", tmdb: "en-US", og: "en_US" },
  id: { label: "ID", native: "Bahasa Indonesia", intl: "id-ID", tmdb: "id-ID", og: "id_ID" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the first supported language from a list of BCP 47 tags, e.g. `navigator.languages`. */
export function pickLocale(tags: readonly string[] | null | undefined): Locale | null {
  for (const tag of tags ?? []) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
