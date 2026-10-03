"use client";

import Link from "@/components/locale-link";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn, formatScore, formatTotalMinutes, formatYear, vars } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { tmdbImage } from "@/lib/images";
import { Container } from "./container";
import { CountUp } from "./count-up";
import { EmptyState } from "./empty-state";
import { useI18n } from "./i18n-provider";
import { Img } from "./img";
import { Pill, TypePill } from "./badges";
import { useWatched, type WatchedItem } from "./watched-provider";

type Tab = "all" | "movie" | "tv";

const TABS: Array<{ value: Tab; label: Key }> = [
  { value: "all", label: "searchPage.all" },
  { value: "movie", label: "nav.movies" },
  { value: "tv", label: "nav.tv" },
];

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

function Stat({ label, index, children }: { label: string; index: number; children: React.ReactNode }) {
  return (
    <div
      className="anim-rise rounded-inner bg-canvas p-4 transition-transform duration-300 ease-out-expo hover:-translate-y-1"
      style={vars({ "--d": `${index * 70}ms` })}
    >
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="t-display mt-1 tabular-nums">{children}</dd>
    </div>
  );
}

function Row({
  item,
  index,
  leaving,
  onRemove,
}: {
  item: WatchedItem;
  index: number;
  leaving: boolean;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  const year = formatYear(item.date);
  return (
    <li
      style={vars({ "--d": `${Math.min(index, 8) * 55}ms` })}
      className={cn(
        "group flex items-center gap-4 rounded-card bg-surface p-2 pr-4 shadow-soft transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-float",
        leaving ? "anim-leave pointer-events-none" : "anim-item",
      )}
    >
      <Link
        href={`/${item.mediaType}/${item.id}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-inner bg-canvas"
      >
        <Img
          src={tmdbImage(item.posterPath, "w185")}
          alt={t("media.poster", { title: item.title })}
          sizes="80px"
          className="object-top"
          hoverZoom="md"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/${item.mediaType}/${item.id}`} className="t-strong line-clamp-1 rounded">
          {item.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <TypePill type={item.mediaType} />
          {year && <span className="t-caption text-muted">{year}</span>}
          {item.certification && (
            <Pill tone="outline" className="px-2 py-0.5 text-xs">
              {item.certification}
            </Pill>
          )}
          {item.audience !== "unrated" && (
            <span className="t-caption text-muted">{t(`aud.${item.audience}`)}</span>
          )}
        </div>
        <p className="t-body mt-2">
          {t("watched.youRated")} <span className="t-strong tabular-nums">{item.userRating}/10</span>
          {item.voteAverage > 0 && (
            <span className="text-muted"> ({t("watched.tmdb", { score: formatScore(item.voteAverage, locale) })})</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("watched.removeAria", { title: item.title })}
        className="tap-target relative grid size-9 shrink-0 place-items-center rounded-full border border-hairline transition-[transform,background-color,color,border-color] duration-300 ease-spring hover:rotate-90 hover:border-ink hover:bg-ink hover:text-on-ink"
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  );
}

export function WatchedView() {
  const { t, locale } = useI18n();
  const { items, ready, remove } = useWatched();
  const [tab, setTab] = useState<Tab>("all");
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const movies = items.filter((i) => i.mediaType === "movie");
    const series = items.filter((i) => i.mediaType === "tv");
    return {
      total: items.length,
      movies: movies.length,
      series: series.length,
      avgUser: average(items.map((i) => i.userRating)),
      avgTmdb: average(items.filter((i) => i.voteAverage > 0).map((i) => i.voteAverage)),
      movieMinutes: movies.reduce((sum, i) => sum + (i.runtime ?? 0), 0),
    };
  }, [items]);

  const visible = tab === "all" ? items : items.filter((i) => i.mediaType === tab);

  // Plays the exit animation, then removes the item.
  const removeWithExit = (item: WatchedItem) => {
    setLeaving((prev) => new Set(prev).add(item.key));
    window.setTimeout(() => {
      remove(item.mediaType, item.id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(item.key);
        return next;
      });
    }, 280);
  };

  return (
    <Container className="pt-8 md:pt-12">
      <h1 className="t-headline anim-rise">{t("nav.list")}</h1>

      {!ready ? (
        <div className="shimmer mt-8 h-40 rounded-card" />
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            photo="seats"
            title={t("watched.emptyTitle")}
            action={{ label: t("watched.emptyAction"), href: "/" }}
          >
            {t("watched.emptyBody")}
          </EmptyState>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-3 rounded-card bg-surface p-3 shadow-soft sm:grid-cols-3 lg:grid-cols-5">
            <Stat label={t("watched.titles")} index={0}>
              <CountUp value={stats.total} />
            </Stat>
            <Stat label={t("watched.moviesSeries")} index={1}>
              <CountUp value={stats.movies} /> / <CountUp value={stats.series} />
            </Stat>
            <Stat label={t("watched.yourAvg")} index={2}>
              <CountUp value={stats.avgUser} decimals={1} />
            </Stat>
            <Stat label={t("watched.tmdbAvg")} index={3}>
              {stats.avgTmdb > 0 ? <CountUp value={stats.avgTmdb} decimals={1} /> : t("watched.na")}
            </Stat>
            <Stat label={t("watched.movieTime")} index={4}>
              {formatTotalMinutes(stats.movieMinutes, locale)}
            </Stat>
          </dl>

          <div role="tablist" aria-label={t("watched.filter")} className="stagger mt-8 flex flex-wrap gap-2">
            {TABS.map((tabDef) => (
              <button
                key={tabDef.value}
                role="tab"
                type="button"
                aria-selected={tab === tabDef.value}
                onClick={() => setTab(tabDef.value)}
                className={cn(
                  "t-body min-h-9 rounded-full border px-4 py-1.5 pointer-coarse:min-h-11 transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-out-expo",
                  tab === tabDef.value
                    ? "border-ink bg-ink text-on-ink"
                    : "border-hairline bg-surface shadow-pill hover:-translate-y-0.5 hover:border-ink hover:shadow-float",
                )}
              >
                {t(tabDef.label)}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p key={tab} className="t-lead anim-fade mt-6 text-muted">
              {t("watched.noneInGroup")}
            </p>
          ) : (
            // key replays the staggered entrance whenever the tab changes.
            <ul key={tab} className="mt-6 grid gap-3 lg:grid-cols-2">
              {visible.map((item, i) => (
                <Row
                  key={item.key}
                  item={item}
                  index={i}
                  leaving={leaving.has(item.key)}
                  onRemove={() => removeWithExit(item)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Container>
  );
}
