"use client";

import Image from "next/image";
import Link from "@/components/locale-link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Star, X } from "lucide-react";
import { cn, formatScore, vars } from "@/lib/format";
import { tmdbImage } from "@/lib/images";
import { localizeHref } from "@/lib/i18n/path";
import type { Suggestion } from "@/lib/types";
import { TypePill } from "./badges";
import { useI18n } from "./i18n-provider";

interface SearchBarProps {
  initial?: string;
  placeholder?: string;
}

const HINT_KEYS = ["search.hint1", "search.hint2", "search.hint3", "search.hint4"] as const;

export function SearchBar({ initial = "", placeholder }: SearchBarProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, Suggestion[]>());

  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState(0);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= 2;
  const optionCount = items.length + (items.length > 0 ? 1 : 0); // + "see all results"

  useEffect(() => setQuery(initial), [initial]);

  // Cycles the placeholder while the field is empty.
  useEffect(() => {
    if (query || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHint((h) => (h + 1) % (HINT_KEYS.length + 1)), 3200);
    return () => clearInterval(t);
  }, [query]);

  // Live suggestions, debounced and cancellable.
  useEffect(() => {
    if (trimmed.length < 2) {
      setItems([]);
      setStatus("idle");
      return;
    }
    // Suggestions are cached per language so switching languages never shows stale titles.
    const key = `${locale}:${trimmed.toLowerCase()}`;
    const cached = cache.current.get(key);
    if (cached) {
      setItems(cached);
      setStatus("done");
      return;
    }
    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}&lang=${locale}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: Suggestion[] };
        cache.current.set(key, data.results);
        setItems(data.results);
        setActive(-1);
        setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setItems([]);
        setStatus("done");
      }
    }, 240);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, locale]);

  // Pressing Enter while nothing is focused jumps to the search field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement === document.body) inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goSearch = () => {
    if (!trimmed) return;
    setOpen(false);
    router.push(localizeHref(locale, `/search?q=${encodeURIComponent(trimmed)}`));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && active < items.length) {
      const s = items[active];
      setOpen(false);
      router.push(localizeHref(locale, `/${s.mediaType}/${s.id}`));
      return;
    }
    goSearch();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "ArrowDown" && optionCount > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount > 0) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    }
  };

  const hints = [placeholder ?? t("search.placeholder"), ...HINT_KEYS.map((k) => t(k))];
  const seeAllIndex = items.length;

  return (
    <div
      ref={wrapRef}
      className={cn("relative", showPanel && "z-40")}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <form
        role="search"
        onSubmit={submit}
        className="group/bar flex items-center rounded-full border border-ink/10 bg-surface py-1 pl-5 pr-1 transition-[box-shadow,border-color,transform] duration-300 ease-out-expo focus-within:scale-[1.02] focus-within:border-ink/30 focus-within:shadow-float hover:border-ink/20"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t("search.placeholder")}
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            id={`${listId}-input`}
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            enterKeyHint="search"
            className="t-lead w-full bg-transparent py-2.5 text-ink [&::-webkit-search-cancel-button]:hidden"
          />
          {!query && (
            <span
              key={hint}
              aria-hidden
              className="anim-fade pointer-events-none absolute inset-y-0 left-0 flex items-center text-muted t-lead"
            >
              {hints[hint]}
            </span>
          )}
        </div>

        {query && (
          <button
            type="button"
            aria-label={t("search.clear")}
            onClick={() => {
              setQuery("");
              setItems([]);
              inputRef.current?.focus();
            }}
            className="anim-pop tap-target relative mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}

        <button
          type="submit"
          aria-label={t("search.submit")}
          className="group grid size-12 shrink-0 place-items-center rounded-full bg-violet text-white shadow-violet transition-[transform,box-shadow] duration-300 ease-spring hover:scale-105 hover:shadow-violet-lg group-focus-within/bar:shadow-violet-lg"
        >
          {status === "loading" ? (
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
          ) : (
            <ArrowRight
              aria-hidden
              className="size-5 transition-transform duration-300 ease-spring group-hover:translate-x-0.5"
            />
          )}
        </button>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label={t("search.suggestions")}
          className="anim-menu absolute inset-x-[-1%] top-full mt-3 overflow-hidden rounded-card bg-surface p-2 shadow-float"
        >
          {status === "loading" && items.length === 0 && (
            <ul aria-hidden className="space-y-1 p-1">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 p-1.5">
                  <div className="shimmer-canvas h-14 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer-canvas h-3.5 w-2/3 rounded-full" />
                    <div className="shimmer-canvas h-3 w-1/3 rounded-full" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {status === "done" && items.length === 0 && (
            <p className="t-body px-4 py-5 text-muted">{t("search.noMatch", { q: trimmed })}</p>
          )}

          {items.map((s, i) => {
            const poster = tmdbImage(s.posterPath, "w185");
            return (
              <Link
                key={`${s.mediaType}-${s.id}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                href={`/${s.mediaType}/${s.id}`}
                tabIndex={-1}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                style={vars({ "--d": `${i * 40}ms` })}
                className={cn(
                  "anim-item flex items-center gap-3 rounded-2xl p-2 transition-colors duration-150",
                  active === i ? "bg-canvas" : "bg-transparent",
                )}
              >
                <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-canvas">
                  {poster && <Image src={poster} alt="" fill sizes="44px" unoptimized className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-strong line-clamp-1 block">{s.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <TypePill type={s.mediaType} />
                    {s.year && <span className="t-caption text-muted">{s.year}</span>}
                  </span>
                </span>
                {s.voteAverage > 0 && (
                  <span className="t-caption inline-flex shrink-0 items-center gap-1 pr-2 text-muted">
                    <Star aria-hidden className="size-3 fill-ink text-ink" />
                    {formatScore(s.voteAverage, locale)}
                  </span>
                )}
              </Link>
            );
          })}

          {items.length > 0 && (
            <button
              type="button"
              id={`${listId}-${seeAllIndex}`}
              role="option"
              aria-selected={active === seeAllIndex}
              onClick={goSearch}
              onMouseEnter={() => setActive(seeAllIndex)}
              style={vars({ "--d": `${items.length * 40}ms` })}
              className={cn(
                "t-strong anim-item group mt-1 flex min-h-11 w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors duration-150",
                active === seeAllIndex ? "bg-canvas" : "bg-transparent",
              )}
            >
              <span className="line-clamp-1">{t("search.seeAll", { q: trimmed })}</span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 transition-transform duration-300 ease-spring group-hover:translate-x-1"
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
