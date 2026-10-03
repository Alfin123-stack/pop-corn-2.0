"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/format";
import { useI18n } from "./i18n-provider";

export type ThemePref = "light" | "dark" | "system";

const STORAGE_KEY = "popcorn-theme";
const EVENT = "popcorn:theme";
const THEME_COLOR = { light: "#f2f4f5", dark: "#0e0f11" } as const;

let transitionTimer: number | undefined;

function readPref(): ThemePref {
  const current = document.documentElement.dataset.themePref;
  return current === "light" || current === "dark" ? current : "system";
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applies a theme. `.theme-transition` stays on <html> for a moment so colors ease into the new
 * palette instead of snapping (see globals.css); it is removed afterwards to keep hovers snappy.
 */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const resolved = pref === "system" ? systemTheme() : pref;

  root.classList.add("theme-transition");
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => root.classList.remove("theme-transition"), 950);

  try {
    if (pref === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage may be blocked; the choice still applies for this visit.
  }

  // Keep the browser UI color (mobile address bar) in step with a manual choice.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute("media");
    meta.setAttribute("content", THEME_COLOR[resolved]);
  });

  window.dispatchEvent(new CustomEvent<ThemePref>(EVENT, { detail: pref }));
}

const OPTIONS = [
  { value: "light", icon: Sun, key: "theme.light" },
  { value: "dark", icon: Moon, key: "theme.dark" },
  { value: "system", icon: Monitor, key: "theme.system" },
] as const;

/** Three-way switch: Light, Dark, System. The thumb is positioned by CSS from <html data-theme-pref>. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { t } = useI18n();
  // Starts as "system" on both server and client; the real value is read after mount.
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    setPref(readPref());
    const onChange = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readPref() === "system") applyTheme("system");
    };
    window.addEventListener(EVENT, onChange);
    media.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener(EVENT, onChange);
      media.removeEventListener("change", onSystem);
    };
  }, []);

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className={cn("relative grid grid-cols-3 rounded-full bg-canvas p-0.5", className)}
    >
      <span
        aria-hidden
        className="theme-thumb absolute bottom-0.5 left-0.5 top-0.5 w-[calc((100%-4px)/3)] rounded-full bg-surface shadow-pill transition-transform duration-500 ease-spring"
      />
      {OPTIONS.map(({ value, icon: Icon, key }) => (
        <button
          key={value}
          type="button"
          aria-pressed={pref === value}
          aria-label={t(key)}
          title={t(key)}
          onClick={() => applyTheme(value)}
          className={cn(
            "relative z-10 grid size-8 place-items-center rounded-full transition-colors duration-300 pointer-coarse:size-11",
            pref === value ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          <Icon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

/** Sun that rolls into a moon. Both icons are always rendered; CSS shows the right one, so there is no flash. */
export function ThemeIcon({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-5 place-items-center", className)}>
      <Sun
        strokeWidth={1.75}
        className="theme-icon absolute size-5 rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-500 ease-spring dark:-rotate-90 dark:scale-0 dark:opacity-0"
      />
      <Moon
        strokeWidth={1.75}
        className="theme-icon absolute size-5 rotate-90 scale-0 opacity-0 transition-[transform,opacity] duration-500 ease-spring dark:rotate-0 dark:scale-100 dark:opacity-100"
      />
    </span>
  );
}

const CYCLE: readonly ThemePref[] = ["light", "dark", "system"];

/**
 * One-button theme control for narrow screens: each tap moves Light, Dark, System. The icon follows
 * <html data-theme-pref> through CSS (see `.pref-icon` in globals.css), so it is right on first paint.
 */
export function ThemeCycle({ className }: { className?: string }) {
  const { t } = useI18n();
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    setPref(readPref());
    const onChange = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[2];
  const label = `${t("theme.label")}: ${t(current.key)}`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => applyTheme(CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length])}
      className={cn(
        "grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-canvas active:scale-95",
        className,
      )}
    >
      <Sun aria-hidden strokeWidth={1.75} className="pref-icon pref-icon-light size-5" />
      <Moon aria-hidden strokeWidth={1.75} className="pref-icon pref-icon-dark size-5" />
      <Monitor aria-hidden strokeWidth={1.75} className="pref-icon pref-icon-system size-5" />
    </button>
  );
}
