import "server-only";

import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES, makeTranslator } from "./index";

/**
 * The language comes from the URL (`/` is English, `/id/...` is Indonesian), never from a cookie or a
 * header, so every URL renders one language and pages can be cached. The route's `[locale]` param is
 * stored once per request; the layout and every page call `setRequestLocale(locale)` before they render
 * anything that reads it.
 */
const requestLocale = cache(() => ({ locale: DEFAULT_LOCALE as Locale }));

export function setRequestLocale(locale: Locale): void {
  requestLocale().locale = locale;
}

export async function getLocale(): Promise<Locale> {
  return requestLocale().locale;
}

/** Translator for server components: `const { t, tp, locale } = await getI18n();` */
export async function getI18n() {
  const locale = await getLocale();
  const dict = DICTIONARIES[locale];
  return { locale, dict, ...makeTranslator(dict, locale) };
}
