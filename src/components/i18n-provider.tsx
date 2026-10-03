"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  LANG_BANNER_KEY,
  LANG_SWITCH_KEY,
  makeTranslator,
  type Dict,
  type Locale,
  type PluralTranslator,
  type Translator,
} from "@/lib/i18n";
import { localizeHref, stripLocale } from "@/lib/i18n/path";

interface I18nValue {
  locale: Locale;
  t: Translator;
  tp: PluralTranslator;
  /** True from the click until the new language has been rendered. */
  switching: boolean;
  /** Navigates to the same page in another language (`/movies` <-> `/id/movies`). */
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Holds the active language, which comes from the URL. Switching navigates to the other language's
 * URL. While that happens the page fades out (`html.lang-switching`), then its sections rise back in
 * (`html.lang-entering`). The new language is a different `[locale]` segment, so the layout can
 * remount; a sessionStorage flag carries the entrance animation across that.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Locale | null>(null);
  const enterTimer = useRef<number | undefined>(undefined);

  const { t, tp } = useMemo(() => makeTranslator(dict, locale), [dict, locale]);

  const playEntrance = useCallback(() => {
    const root = document.documentElement;
    root.classList.remove("lang-switching");
    root.classList.add("lang-entering");
    window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => root.classList.remove("lang-entering"), 1200);
  }, []);

  // After a language switch the freshly mounted provider finishes the animation the old one started.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("lang-switching");
    try {
      if (sessionStorage.getItem(LANG_SWITCH_KEY)) {
        sessionStorage.removeItem(LANG_SWITCH_KEY);
        playEntrance();
      }
    } catch {
      // storage unavailable: skip the entrance
    }
  }, [playEntrance]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale || target) return;
      const dest = localizeHref(next, stripLocale(pathname)) + window.location.search;
      try {
        sessionStorage.setItem(LANG_SWITCH_KEY, "1");
        // Choosing a language by hand means the "view in another language" suggestion is no longer needed.
        localStorage.setItem(LANG_BANNER_KEY, "1");
      } catch {
        // storage unavailable
      }
      window.clearTimeout(enterTimer.current);
      document.documentElement.classList.remove("lang-entering");
      document.documentElement.classList.add("lang-switching");
      setTarget(next);
      startTransition(() => router.push(dest));
    },
    [locale, target, pathname, router],
  );

  // If this provider survives the navigation, play the entrance here and clear the busy state.
  useEffect(() => {
    if (target === null || pending) return;
    if (locale === target) {
      try {
        sessionStorage.removeItem(LANG_SWITCH_KEY);
      } catch {
        // ignore
      }
      playEntrance();
    } else {
      document.documentElement.classList.remove("lang-switching");
    }
    setTarget(null);
  }, [pending, target, locale, playEntrance]);

  const value = useMemo<I18nValue>(
    () => ({ locale, t, tp, switching: target !== null, setLocale }),
    [locale, t, tp, target, setLocale],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
      {target !== null && <div aria-hidden className="lang-progress" />}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
