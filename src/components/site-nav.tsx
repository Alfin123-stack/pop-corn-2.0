"use client";

import Image from "next/image";
import Link from "@/components/locale-link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Film, House, Search, Tv, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";
import { unsplash } from "@/lib/images";
import { stripLocale } from "@/lib/i18n/path";
import type { Key } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { CompactPrefs } from "./compact-prefs";
import { ThemeSwitch } from "./theme-toggle";
import { useI18n } from "./i18n-provider";
import { useWatched } from "./watched-provider";

const LINKS: Array<{ label: Key; href: string; icon: LucideIcon; match: (p: string) => boolean }> = [
  { label: "nav.home", href: "/", icon: House, match: (p) => p === "/" },
  { label: "nav.movies", href: "/movies", icon: Film, match: (p) => p.startsWith("/movies") || p.startsWith("/movie/") },
  { label: "nav.tv", href: "/tv", icon: Tv, match: (p) => p.startsWith("/tv") },
];

export function SiteNav() {
  // The URL carries the language (`/id/movies`); matching is done on the language-free path.
  const pathname = stripLocale(usePathname());
  const { t, tp, locale } = useI18n();
  const { items, ready } = useWatched();
  const count = items.length;

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeIndex = LINKS.findIndex((l) => l.match(pathname));
  const target = hover ?? (activeIndex >= 0 ? activeIndex : null);

  // The highlight slides to whichever link is hovered, and back to the active one.
  useLayoutEffect(() => {
    const measure = () => {
      if (target === null) return setRect(null);
      const el = linkRefs.current[target];
      if (el) setRect({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [target, locale]);

  // Hides while scrolling down, returns on any scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        setScrolled(y > 8);
        if (y < 80) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setHidden(false), [pathname]);

  const listActive = pathname.startsWith("/watched");
  const searchActive = pathname.startsWith("/search");

  return (
    <header
      onFocusCapture={() => setHidden(false)}
      className={cn(
        "sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-transform duration-500 ease-out-expo",
        hidden && "-translate-y-[140%]",
      )}
    >
      <a
        href="#content"
        className="t-strong sr-only left-4 top-3 rounded-full bg-ink px-4 py-2 text-on-ink focus:not-sr-only focus:absolute"
      >
        {t("nav.skip")}
      </a>
      <div className="mx-auto max-w-[75rem] px-3 pt-3 sm:px-6">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border bg-surface/90 py-1.5 pl-3 pr-1.5 backdrop-blur-md sm:pl-4 transition-[box-shadow,border-color] duration-300",
            scrolled ? "border-hairline shadow-float" : "border-transparent shadow-pill",
          )}
        >
          <Link href="/" aria-label={t("nav.homeAria")} className="group mr-2 flex items-center gap-2 rounded-full">
            <span
              aria-hidden
              className="size-3 rounded-full bg-violet transition-transform duration-300 ease-spring group-hover:scale-150"
            />
            <span className="t-display hidden text-violet sm:inline">popcorn</span>
          </Link>

          <nav
            aria-label={t("nav.main")}
            className="relative flex items-center"
            onMouseLeave={() => setHover(null)}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full rounded-full bg-canvas transition-[transform,width,opacity] duration-300 ease-out-expo"
              style={{
                width: rect?.width ?? 0,
                transform: `translateX(${rect?.left ?? 0}px)`,
                opacity: rect ? 1 : 0,
              }}
            />
            {LINKS.map(({ label: labelKey, href, icon: Icon, match }, i) => {
              const active = match(pathname);
              const label = t(labelKey);
              return (
                <Link
                  key={href}
                  href={href}
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "t-body relative z-10 flex min-h-11 items-center gap-2 rounded-full px-2.5 py-2.5 transition-colors duration-200 min-[400px]:px-3 sm:px-3.5",
                    active ? "font-medium text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
                  <span className="t-swap hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center sm:gap-1">
            <div className="hidden items-center gap-2 pr-1 lg:flex">
              <LangSwitch />
              <ThemeSwitch />
            </div>
            <CompactPrefs />
            <Link
              href="/search"
              aria-label={t("nav.search")}
              title={t("nav.search")}
              aria-current={searchActive ? "page" : undefined}
              className={cn(
                "group grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-canvas",
                searchActive && "bg-canvas",
              )}
            >
              <Search
                aria-hidden
                className="size-5 transition-transform duration-300 ease-spring group-hover:-rotate-12 group-hover:scale-110"
                strokeWidth={1.75}
              />
            </Link>
            <Link
              href="/watched"
              aria-label={ready ? tp("nav.listCount", count) : t("nav.list")}
              aria-current={listActive ? "page" : undefined}
              className={cn(
                "group t-body relative flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors duration-200 hover:bg-canvas min-[400px]:pr-2 lg:pr-4",
                listActive && "bg-canvas",
              )}
            >
              <span className="relative block size-9 overflow-hidden rounded-full ring-1 ring-hairline transition-transform duration-300 ease-spring group-hover:scale-105">
                <Image src={unsplash("viewer", 96)} alt="" fill sizes="36px" className="object-cover" />
              </span>
              <span className="t-swap hidden font-medium lg:inline">{t("nav.list")}</span>
              {ready && count > 0 && (
                <span
                  key={count}
                  className="t-caption anim-pop absolute left-6 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 tabular-nums text-on-ink ring-2 ring-surface lg:static lg:ring-0"
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
