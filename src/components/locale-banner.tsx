"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LANG_BANNER_KEY, pickLocale, type Locale } from "@/lib/i18n/config";
import { localizeHref, stripLocale } from "@/lib/i18n/path";
import { useI18n } from "./i18n-provider";

/** Each message is written in the language it offers, so the visitor can read it before switching. */
const COPY: Record<Locale, { text: string; action: string; dismiss: string }> = {
  en: { text: "View popcorn in English?", action: "Switch to English", dismiss: "Dismiss" },
  id: { text: "Lihat popcorn dalam Bahasa Indonesia?", action: "Ganti ke Bahasa Indonesia", dismiss: "Tutup" },
};

/**
 * Suggests the visitor's browser language, once. It never redirects on its own: that would hide
 * pages from crawlers and surprise people who chose a language on purpose.
 */
export function LocaleBanner() {
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const [offer, setOffer] = useState<Locale | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(LANG_BANNER_KEY)) return;
    } catch {
      return;
    }
    const preferred = pickLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
    setOffer(preferred && preferred !== locale ? preferred : null);
  }, [locale]);

  if (!offer) return null;
  const copy = COPY[offer];

  const dismiss = () => {
    try {
      localStorage.setItem(LANG_BANNER_KEY, "1");
    } catch {
      // storage unavailable: the banner returns next visit
    }
    setOffer(null);
  };

  return (
    <div
      role="region"
      aria-label={copy.text}
      lang={offer}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-[28rem] flex-wrap items-center gap-2 rounded-card bg-ink py-2 pl-5 pr-2 text-on-ink shadow-float"
    >
      <p className="t-body min-w-0 flex-1 basis-40">{copy.text}</p>
      <a
        href={localizeHref(offer, stripLocale(pathname))}
        hrefLang={offer}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          setOffer(null);
          setLocale(offer);
        }}
        className="t-strong inline-flex min-h-11 shrink-0 items-center rounded-full bg-violet px-4 text-white"
      >
        {copy.action}
      </a>
      <button
        type="button"
        aria-label={copy.dismiss}
        onClick={dismiss}
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/10"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
