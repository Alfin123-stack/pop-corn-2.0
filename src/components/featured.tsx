import Link from "@/components/locale-link";
import { ArrowUpRight } from "lucide-react";
import { formatScore, formatVotes, formatYear } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { tmdbImage, unsplash } from "@/lib/images";
import type { MediaSummary } from "@/lib/types";
import { Img } from "./img";
import { Stars } from "./stars";

/** Full-bleed backdrop card, title in white on a flat scrim. The image is the card. */
export async function Featured({ item }: { item: MediaSummary }) {
  const { t, locale } = await getI18n();
  const backdrop = tmdbImage(item.backdropPath, "w1280") ?? unsplash("cinema", 1400);
  const year = formatYear(item.date);
  return (
    <Link
      href={`/${item.mediaType}/${item.id}`}
      className="group relative block min-h-[22.5rem] overflow-hidden rounded-card bg-slate-ink shadow-soft transition-shadow duration-500 hover:shadow-float lg:min-h-full"
    >
      <Img src={backdrop} alt="" sizes="(min-width: 1024px) 700px, 100vw" hoverZoom="sm" />
      <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/55" />
      <span
        aria-hidden
        className="absolute right-5 top-5 grid size-11 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 shadow-pill transition-[transform,opacity] duration-300 ease-spring group-hover:translate-y-0 group-hover:opacity-100 sm:right-7 sm:top-7"
      >
        <ArrowUpRight className="size-5" />
      </span>
      <div className="absolute inset-0 flex flex-col justify-between p-5 text-white sm:p-8">
        <div>
          <p className="t-meta text-white/80">
            {item.mediaType === "movie" ? t("media.movie") : t("media.tv")}
            {year ? `, ${year}` : ""}
          </p>
          <h3
            className="t-headline mt-2 max-w-[16ch] text-balance transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5"
          >
            {item.title}
          </h3>
          {item.voteCount > 0 && (
            <div className="t-body mt-3 flex items-center gap-2">
              <Stars value={item.voteAverage} size={14} />
              <span>
                {t("media.votes", {
                  score: formatScore(item.voteAverage, locale),
                  votes: formatVotes(item.voteCount, locale),
                })}
              </span>
            </div>
          )}
        </div>
        {item.overview && (
          <p
            className="t-lead line-clamp-3 max-w-[52ch] translate-y-1 text-white/90 transition-transform duration-500 ease-out-expo group-hover:translate-y-0"
          >
            {item.overview}
          </p>
        )}
      </div>
    </Link>
  );
}
