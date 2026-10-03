"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { localizeHref, stripLocale } from "@/lib/i18n/path";
import { cn } from "@/lib/format";
import { useI18n } from "./i18n-provider";

/**
 * Segmented language control (EN | ID). Each option is a real link to that language's URL, with
 * `hreflang`, so crawlers can follow it. A plain click is intercepted to play the transition;
 * modified clicks (new tab, etc.) behave like any link. The thumb slides to the active language.
 */
export function LangSwitch({ className }: { className?: string }) {
  const { locale, setLocale, switching, t } = useI18n();
  const pathname = usePathname();
  const base = stripLocale(pathname);
  const index = LOCALES.indexOf(locale);

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      aria-busy={switching}
      className={cn("relative grid rounded-full bg-canvas p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${LOCALES.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-surface shadow-pill transition-transform duration-500 ease-spring"
        style={{
          width: `calc((100% - 4px) / ${LOCALES.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {LOCALES.map((code) => (
        <a
          key={code}
          href={localizeHref(code, base)}
          hrefLang={code}
          lang={code}
          aria-current={locale === code ? "true" : undefined}
          aria-label={LOCALE_META[code].native}
          title={LOCALE_META[code].native}
          onClick={(e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            setLocale(code);
          }}
          className={cn(
            "t-meta relative z-10 grid h-8 min-w-9 place-items-center rounded-full px-2 transition-colors duration-300 pointer-coarse:h-11 pointer-coarse:min-w-11",
            locale === code ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          {LOCALE_META[code].label}
        </a>
      ))}
    </div>
  );
}
