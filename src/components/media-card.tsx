import Link from "@/components/locale-link";
import { ArrowUpRight } from "lucide-react";
import { formatScore, formatVotes, formatYear } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { tmdbImage } from "@/lib/images";
import type { MediaSummary } from "@/lib/types";
import { TypePill } from "./badges";
import { Img } from "./img";
import { Reveal } from "./reveal";
import { Stars } from "./stars";

/** Brand-spotlight style card: 28px shell, 20px inner image, no border. Lifts and zooms on hover. */
export async function MediaCard({ item, priority = false }: { item: MediaSummary; priority?: boolean }) {
  const { t, locale } = await getI18n();
  const year = formatYear(item.date);
  return (
    <Link
      href={`/${item.mediaType}/${item.id}`}
      className="group block rounded-card bg-surface p-2 shadow-soft transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-2 hover:shadow-float active:translate-y-0 active:scale-[0.985]"
    >
      <div className="relative aspect-square overflow-hidden rounded-inner bg-canvas">
        <Img
          src={tmdbImage(item.posterPath, "w342")}
          alt={t("media.poster", { title: item.title })}
          sizes="(min-width: 1536px) 280px, (min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
          className="object-top"
          priority={priority}
          hoverZoom="md"
        />
        <span
          aria-hidden
          className="absolute bottom-3 right-3 grid size-9 translate-y-3 place-items-center rounded-full bg-white text-black opacity-0 shadow-pill transition-[transform,opacity] duration-300 ease-spring group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="px-2 pb-2 pt-3">
        <p className="t-strong line-clamp-1">{item.title}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-ink">
          {item.voteCount > 0 ? (
            <>
              <Stars value={item.voteAverage} size={11} />
              <span className="t-caption text-muted">
                {formatScore(item.voteAverage, locale)} ({formatVotes(item.voteCount, locale)})
              </span>
            </>
          ) : (
            <span className="t-caption text-muted">{t("media.noRatings")}</span>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <TypePill type={item.mediaType} />
          {year && <span className="t-caption text-muted">{year}</span>}
        </div>
      </div>
    </Link>
  );
}

/** Wrapper used inside horizontal rails. Items appear in sequence as the rail scrolls into view. */
export function RailItem({ item, index = 0 }: { item: MediaSummary; index?: number }) {
  return (
    <Reveal
      delay={(index % 6) * 70}
      className="w-44 shrink-0 snap-start py-2 sm:w-[12.75rem]"
    >
      <MediaCard item={item} />
    </Reveal>
  );
}

/** Responsive grid whose cards rise in one after another. */
export function MediaGrid({ items }: { items: MediaSummary[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(8.5rem,18%)),1fr))] gap-3">
      {items.map((item, i) => (
        <Reveal as="li" key={`${item.mediaType}-${item.id}`} delay={(i % 5) * 70}>
          <MediaCard item={item} priority={i < 4} />
        </Reveal>
      ))}
    </ul>
  );
}

/** Product-image tile: image fills the card, translucent label chip on top. */
export async function MediaTile({ item }: { item: MediaSummary }) {
  const { t } = await getI18n();
  const year = formatYear(item.date);
  return (
    <Link
      href={`/${item.mediaType}/${item.id}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-inner bg-canvas shadow-soft transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1.5 hover:shadow-float"
    >
      <Img
        src={tmdbImage(item.posterPath, "w500")}
        alt={t("media.poster", { title: item.title })}
        sizes="(min-width: 1024px) 240px, 45vw"
        hoverZoom="md"
      />
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-surface/85 p-3 backdrop-blur-sm transition-transform duration-500 ease-out-expo group-hover:-translate-y-1">
        <p className="t-strong line-clamp-1">{item.title}</p>
        <p className="t-caption mt-0.5 text-muted">
          {item.mediaType === "movie" ? t("media.movie") : t("media.tv")}
          {year ? `, ${year}` : ""}
        </p>
      </div>
    </Link>
  );
}
