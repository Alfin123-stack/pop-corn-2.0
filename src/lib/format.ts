import type { CSSProperties } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./i18n/config";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* Every formatter takes the active locale (defaults to English) so numbers, dates and units follow the language. */

const UNITS: Record<Locale, { h: string; m: string; thousand: string; million: string }> = {
  en: { h: "h", m: "m", thousand: "K", million: "M" },
  id: { h: "j", m: "m", thousand: "rb", million: "jt" },
};

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Locale-aware number with a fixed number of decimals (1234.5 -> "1.234,5" in Indonesian). */
export function formatNumber(n: number, locale: Locale = DEFAULT_LOCALE, decimals = 0): string {
  const key = `${locale}:${decimals}`;
  let nf = numberFormats.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(LOCALE_META[locale].intl, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormats.set(key, nf);
  }
  return nf.format(n);
}

/** One-decimal score, e.g. "8.4" or "8,4". */
export function formatScore(n: number, locale: Locale = DEFAULT_LOCALE): string {
  return formatNumber(n, locale, 1);
}

export function formatRuntime(minutes: number | null | undefined, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!minutes || minutes <= 0) return null;
  const u = UNITS[locale];
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${u.m}`;
  return m === 0 ? `${h}${u.h}` : `${h}${u.h} ${m}${u.m}`;
}

const dateFormats = new Map<Locale, Intl.DateTimeFormat>();

export function formatDate(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  let df = dateFormats.get(locale);
  if (!df) {
    df = new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    dateFormats.set(locale, df);
  }
  return df.format(d);
}

export function formatYear(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 4) return null;
  return iso.slice(0, 4);
}

export function formatVotes(n: number, locale: Locale = DEFAULT_LOCALE): string {
  const u = UNITS[locale];
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, locale, 1)}${locale === "id" ? " " : ""}${u.million}`;
  if (n >= 1_000) return `${formatNumber(n / 1_000, locale, 1)}${locale === "id" ? " " : ""}${u.thousand}`;
  return formatNumber(n, locale);
}

export function formatMoney(n: number | null | undefined, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!n || n <= 0) return null;
  return new Intl.NumberFormat(LOCALE_META[locale].intl, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatLanguage(code: string, locale: Locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatTotalMinutes(minutes: number, locale: Locale = DEFAULT_LOCALE): string {
  const u = UNITS[locale];
  if (minutes <= 0) return `0${u.h}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}${u.h}` : `${h}${u.h} ${m}${u.m}`;
}

/** Typed inline CSS custom properties, e.g. style={vars({ "--d": "120ms" })}. */
export function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}
