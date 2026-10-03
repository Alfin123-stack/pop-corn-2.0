import Link from "@/components/locale-link";
import { formatVotes, vars } from "@/lib/format";
import { tmdbImage } from "@/lib/images";
import type { Locale } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import type { MediaSummary } from "@/lib/types";
import { CategoryPills } from "./category-pills";
import { HeroStage } from "./hero-stage";
import { Img } from "./img";
import { SearchBar } from "./search-bar";
import { Stars } from "./stars";

// Five floating cards in a loose constellation, sized in container units (cqi) so the whole stage
// scales with the width it is given instead of jumping between fixed pixel sizes. Below ~36rem of
// stage width only three cards show; the outer two appear from there up. `depth` is how far (px) a
// card drifts with the pointer; nearer cards drift more.
const SLOTS = [
  { cls: "@max-xl:hidden left-[9%] top-[7.3cqi] w-[16.8cqi] -rotate-[8deg] z-10", depth: 10, dur: "6.4s", delay: "-1.2s" },
  { cls: "left-[19%] top-[9.5cqi] w-[31cqi] -rotate-[4deg] z-20 @xl:left-[29%] @xl:top-[3cqi] @xl:w-[19.5cqi]", depth: 18, dur: "5.6s", delay: "-3.1s" },
  { cls: "left-1/2 top-0 w-[40cqi] z-30 @xl:w-[23.2cqi]", depth: 26, dur: "6.8s", delay: "-0.4s" },
  { cls: "left-[81%] top-[9.5cqi] w-[31cqi] rotate-[4deg] z-20 @xl:left-[71%] @xl:top-[3.6cqi] @xl:w-[19.5cqi]", depth: 18, dur: "5.9s", delay: "-2.3s" },
  { cls: "@max-xl:hidden left-[91%] top-[8cqi] w-[16.8cqi] rotate-[8deg] z-10", depth: 10, dur: "6.2s", delay: "-4.4s" },
];

function FloatingCard({
  item,
  slot,
  index,
  alt,
  locale,
}: {
  item: MediaSummary;
  slot: (typeof SLOTS)[number];
  index: number;
  alt: string;
  locale: Locale;
}) {
  return (
    <div
      className={`hero-drop absolute -translate-x-1/2 transition-[rotate] duration-500 ease-spring hover:z-40 hover:rotate-0 ${slot.cls}`}
      style={vars({ "--i": index })}
    >
      <div className="parallax-layer" style={vars({ "--depth": slot.depth })}>
        <Link
          href={`/${item.mediaType}/${item.id}`}
          className="hero-float group block rounded-card bg-surface p-2 shadow-soft transition-[scale,box-shadow] duration-500 ease-spring hover:scale-[1.09] hover:shadow-float"
          style={vars({ "--float-dur": slot.dur, "--float-delay": slot.delay })}
        >
          <div className="relative aspect-square overflow-hidden rounded-inner bg-canvas">
            <Img
              src={tmdbImage(item.posterPath, "w342")}
              alt={alt}
              sizes="(min-width: 640px) 204px, 40vw"
              className="object-top"
              priority={index === 2}
              hoverZoom="sm"
            />
          </div>
          <div className="px-1.5 pb-1.5 pt-2.5">
            <p className="t-strong line-clamp-1">{item.title}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Stars value={item.voteAverage} size={10} />
              <span className="t-caption text-muted">{formatVotes(item.voteCount, locale)}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

const WORD = "popcorn";

export async function Hero({ items }: { items: MediaSummary[] }) {
  const { t, locale } = await getI18n();
  const cards = items.filter((i) => i.posterPath).slice(0, 5);
  return (
    <section aria-labelledby="home-title" className="pt-8 sm:pt-10">
      {cards.length > 0 && (
        <div className="@container mx-auto w-full max-w-[55rem]">
          <HeroStage className="relative h-[73cqi] w-full @xl:h-[38.6cqi]">
            {cards.map((item, i) => (
              <FloatingCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                slot={SLOTS[i]}
                index={i}
                alt={t("media.poster", { title: item.title })}
                locale={locale}
              />
            ))}
          </HeroStage>
        </div>
      )}
      <p aria-hidden className="t-wordmark mt-6 text-center text-violet sm:mt-8">
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            aria-hidden
            className="kernel-letter anim-rise"
            style={vars({ "--d": `${380 + i * 60}ms` })}
          >
            {ch}
          </span>
        ))}
      </p>
      <h1
        id="home-title"
        className="t-lead anim-rise mx-auto mt-4 max-w-[34ch] text-balance text-center text-muted"
        style={vars({ "--d": "700ms" })}
      >
        {t("home.h1")}
      </h1>
      <div className="anim-rise mx-auto mt-6 max-w-[40rem]" style={vars({ "--d": "800ms" })}>
        <SearchBar placeholder={t("search.placeholder")} />
      </div>
      <div className="mx-auto mt-6 max-w-[67.5rem]">
        <CategoryPills />
      </div>
    </section>
  );
}
