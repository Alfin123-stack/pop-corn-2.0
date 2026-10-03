"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn, formatDate, formatRuntime, formatScore, formatYear, vars } from "@/lib/format";
import { tmdbImage } from "@/lib/images";
import type { EpisodeRef, EpisodeSummary, SeasonSummary } from "@/lib/types";
import { useI18n } from "./i18n-provider";

interface SeasonPanelProps {
  tvId: number;
  seasons: SeasonSummary[];
  nextEpisode: EpisodeRef | null;
}

type LoadState = "idle" | "loading" | "error";

/** Long-running series can have hundreds of episodes in one season; show them a page at a time. */
const PAGE_SIZE = 20;

export function SeasonPanel({ tvId, seasons, nextEpisode }: SeasonPanelProps) {
  const { t, tp, locale } = useI18n();
  const initial = seasons.find((s) => s.seasonNumber > 0) ?? seasons[0];
  const [selected, setSelected] = useState(initial?.seasonNumber ?? 1);
  const [state, setState] = useState<LoadState>("idle");
  // Episodes are cached per language, so switching language refetches them instead of showing stale text.
  const [episodes, setEpisodes] = useState<Record<string, EpisodeSummary[]>>({});
  const [page, setPage] = useState(0);
  const listTopRef = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (season: number, signal?: AbortSignal) => {
      setState("loading");
      try {
        const res = await fetch(`/api/tv/${tvId}/season/${season}?lang=${locale}`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { episodes: EpisodeSummary[] };
        setEpisodes((prev) => ({ ...prev, [`${locale}:${season}`]: data.episodes }));
        setState("idle");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState("error");
      }
    },
    [tvId, locale],
  );

  useEffect(() => {
    if (episodes[`${locale}:${selected}`]) return;
    const controller = new AbortController();
    void load(selected, controller.signal);
    return () => controller.abort();
  }, [selected, episodes, load, locale]);

  const list = episodes[`${locale}:${selected}`];
  const pageCount = list ? Math.ceil(list.length / PAGE_SIZE) : 0;
  const current = Math.min(page, Math.max(pageCount - 1, 0));

  // Keep the active range chip in view when there are many of them.
  useEffect(() => {
    // Scroll the chip row itself, never the page (scrollIntoView would also jump the page down to the chips).
    const row = rangesRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !active) return;
    row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2 });
  }, [current, pageCount]);

  const goToPage = (next: number) => {
    setPage(next);
    // If the top of the list is above the viewport (the visitor used the buttons at the bottom), bring it back.
    requestAnimationFrame(() => {
      const top = listTopRef.current;
      if (top && top.getBoundingClientRect().top < 80) {
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        top.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      }
    });
  };

  if (!initial) return null;
  const season = seasons.find((s) => s.seasonNumber === selected) ?? initial;
  const pageStart = current * PAGE_SIZE;
  const visible = list ? list.slice(pageStart, pageStart + PAGE_SIZE) : [];

  return (
    <div>
      <div role="tablist" aria-label={t("season.tabs")} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {seasons.map((s) => {
          const active = s.seasonNumber === selected;
          return (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => {
                setSelected(s.seasonNumber);
                setPage(0);
              }}
              className={cn(
                "t-body min-h-9 shrink-0 rounded-full border px-4 py-1.5 pointer-coarse:min-h-11",
                "transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-out-expo active:scale-95",
                active
                  ? "border-ink bg-ink text-on-ink"
                  : "border-hairline bg-surface shadow-pill hover:-translate-y-0.5 hover:border-ink hover:shadow-float",
              )}
            >
              {s.seasonNumber === 0 ? t("season.specials") : t("season.n", { n: s.seasonNumber })}
            </button>
          );
        })}
      </div>

      <div key={selected} role="tabpanel" className="anim-fade mt-5 rounded-card bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="t-display">{season.name}</h3>
          <p className="t-body text-muted">
            {tp("detail.episode", season.episodeCount)}
            {formatYear(season.airDate) ? `, ${formatYear(season.airDate)}` : ""}
          </p>
        </div>
        {season.overview && <p className="t-body mt-2 max-w-[70ch] text-muted">{season.overview}</p>}
        {nextEpisode && nextEpisode.seasonNumber === selected && (
          <p className="t-meta mt-3 inline-block rounded-full bg-canvas px-3 py-1">
            {nextEpisode.airDate
              ? t("season.nextAirs", {
                  n: nextEpisode.episodeNumber,
                  date: formatDate(nextEpisode.airDate, locale) ?? "",
                })
              : t("season.next", { n: nextEpisode.episodeNumber })}
          </p>
        )}

        <div className="mt-5" aria-live="polite">
          {state === "loading" && !list && (
            <ul className="space-y-3" aria-label={t("season.loading")}>
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="shimmer-canvas h-16 rounded-xl" />
              ))}
            </ul>
          )}

          {state === "error" && !list && (
            <div className="rounded-xl bg-canvas p-4">
              <p className="t-body">{t("season.error")}</p>
              <button
                type="button"
                onClick={() => void load(selected)}
                className="t-strong mt-2 min-h-11 rounded-full bg-ink px-4 py-1.5 text-on-ink"
              >
                {t("season.retry")}
              </button>
            </div>
          )}

          {list && list.length === 0 && (
            <p className="t-body text-muted">{t("season.none")}</p>
          )}

          {list && list.length > 0 && (
            <>
              {pageCount > 1 && (
                <div
                  ref={rangesRef}
                  role="group"
                  aria-label={t("season.pages")}
                  className="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1"
                >
                  {Array.from({ length: pageCount }, (_, p) => {
                    const from = list[p * PAGE_SIZE].number;
                    const to = list[Math.min((p + 1) * PAGE_SIZE, list.length) - 1].number;
                    const active = p === current;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={active}
                        onClick={() => goToPage(p)}
                        className={cn(
                          "t-meta min-h-8 shrink-0 rounded-full border px-3.5 py-1 tabular-nums pointer-coarse:min-h-11",
                          "transition-[transform,background-color,color,border-color] duration-300 ease-out-expo active:scale-95",
                          active
                            ? "border-ink bg-ink text-on-ink"
                            : "border-hairline bg-canvas hover:border-ink",
                        )}
                      >
                        {from === to ? `E${from}` : `E${from}–${to}`}
                      </button>
                    );
                  })}
                </div>
              )}

              <div ref={listTopRef} className="scroll-mt-24" />
              <ol key={`${selected}:${current}`} className="divide-y divide-hairline">
                {visible.map((ep, index) => {
                  const still = tmdbImage(ep.stillPath, "w300");
                  const runtime = formatRuntime(ep.runtime, locale);
                  const aired = formatDate(ep.airDate, locale);
                  return (
                    <li
                      key={ep.id}
                      style={vars({ "--d": `${Math.min(index, 9) * 45}ms` })}
                      className="anim-item group -mx-2 flex gap-4 rounded-xl px-2 py-4 transition-colors duration-200 first:pt-4 hover:bg-canvas"
                    >
                      <div className="relative hidden h-[63px] w-28 shrink-0 overflow-hidden rounded-xl bg-canvas group-hover:bg-surface sm:block">
                        {still && (
                          <Image
                            src={still}
                            alt=""
                            fill
                            sizes="112px"
                            unoptimized
                            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="t-strong">
                          <span className="text-muted">E{ep.number}</span> {ep.name}
                        </p>
                        <div className="t-caption mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted">
                          {aired && <span>{aired}</span>}
                          {runtime && <span>{runtime}</span>}
                          {ep.voteAverage > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Star aria-hidden className="size-3 fill-current" />
                              {formatScore(ep.voteAverage, locale)}
                            </span>
                          )}
                        </div>
                        {ep.overview && <p className="t-body mt-1.5 line-clamp-2 text-muted">{ep.overview}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-4">
                  <p className="t-meta text-muted" aria-live="polite">
                    {t("season.showing", {
                      from: pageStart + 1,
                      to: pageStart + visible.length,
                      total: list.length,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goToPage(current - 1)}
                      disabled={current === 0}
                      aria-label={t("season.prev")}
                      title={t("season.prev")}
                      className="grid size-9 place-items-center rounded-full border border-hairline bg-surface transition-[transform,opacity,border-color] duration-300 ease-out-expo enabled:hover:border-ink enabled:active:scale-95 disabled:opacity-40 pointer-coarse:size-11"
                    >
                      <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPage(current + 1)}
                      disabled={current >= pageCount - 1}
                      aria-label={t("season.nextPage")}
                      title={t("season.nextPage")}
                      className="grid size-9 place-items-center rounded-full border border-hairline bg-surface transition-[transform,opacity,border-color] duration-300 ease-out-expo enabled:hover:border-ink enabled:active:scale-95 disabled:opacity-40 pointer-coarse:size-11"
                    >
                      <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
