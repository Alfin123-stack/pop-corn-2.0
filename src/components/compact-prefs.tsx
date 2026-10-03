"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { localizeHref, stripLocale } from "@/lib/i18n/path";
import { ThemeCycle } from "./theme-toggle";
import { useI18n } from "./i18n-provider";

/**
 * Language and theme for screens too narrow for the full switches: two always-visible buttons, no menu.
 * The language button is a real link (hreflang) to the other language; the theme button cycles
 * Light, Dark, System on each tap.
 */
export function CompactPrefs() {
  return (
    <div className="flex items-center lg:hidden">
      <LangToggle />
      <ThemeCycle />
    </div>
  );
}

function LangToggle() {
  const { locale, setLocale, switching, t } = useI18n();
  const pathname = usePathname();
  const base = stripLocale(pathname);
  // Shows the current language; one tap goes to the next one (there are two today).
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
  const label = t("lang.switchTo", { lang: LOCALE_META[next].native });

  return (
    <a
      href={localizeHref(next, base)}
      hrefLang={next}
      lang={next}
      aria-label={label}
      title={label}
      aria-busy={switching}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setLocale(next);
      }}
      className="t-meta grid size-11 place-items-center rounded-full font-semibold transition-colors duration-200 hover:bg-canvas"
    >
      {LOCALE_META[locale].label}
    </a>
  );
}
