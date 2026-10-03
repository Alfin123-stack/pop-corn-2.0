import { en, type Dict, type Key } from "./en";
import { id } from "./id";
import { LOCALE_META, type Locale } from "./config";

export * from "./config";
export type { Dict, Key } from "./en";

export const DICTIONARIES: Record<Locale, Dict> = { en, id };

export type Vars = Record<string, string | number>;

/** Keys that have `.one` / `.other` variants, without the suffix. */
export type PluralKey = Key extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

export type Translator = (key: Key, vars?: Vars) => string;
export type PluralTranslator = (key: PluralKey, count: number, vars?: Vars) => string;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Builds `t` and `tp` for one locale. Works on the server and in the browser. */
export function makeTranslator(dict: Dict, locale: Locale) {
  const t: Translator = (key, vars) => interpolate(dict[key] ?? DICTIONARIES.en[key] ?? key, vars);
  const rules = new Intl.PluralRules(LOCALE_META[locale].intl);
  const tp: PluralTranslator = (key, count, vars) => {
    const form = rules.select(count) === "one" ? "one" : "other";
    return t(`${key}.${form}` as Key, { n: count, ...vars });
  };
  return { t, tp };
}

/** Maps a TMDB status ("Returning Series") to a translated label, or returns it unchanged. */
export function statusLabel(t: Translator, status: string): string {
  const key = `status.${status}` as Key;
  return key in en ? t(key) : status;
}
