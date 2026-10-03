import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Featured } from "@/components/featured";
import { Hero } from "@/components/hero";
import { MediaTile, RailItem } from "@/components/media-card";
import { Rail } from "@/components/rail";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { SetupNotice } from "@/components/setup-notice";
import { JsonLd } from "@/components/json-ld";
import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { itemListJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { discover, getList, getTrending, isTmdbConfigured } from "@/lib/tmdb";
import type { MediaSummary, Paged } from "@/lib/types";

// Static per language and refreshed hourly. TMDB_API_KEY must be available at build time (it is on
// Vercel and most hosts); without it the build still succeeds and the page shows the setup notice.
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  const { t } = await getI18n();
  return buildMetadata({
    locale,
    path: "/",
    title: t("meta.homeTitle"),
    description: t("meta.description"),
    absoluteTitle: true,
  });
}

function unwrap(result: PromiseSettledResult<Paged<MediaSummary> | MediaSummary[]>): MediaSummary[] {
  if (result.status !== "fulfilled") return [];
  return Array.isArray(result.value) ? result.value : result.value.results;
}

function RailSection({ title, href, items }: { title: string; href: string; items: MediaSummary[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title} href={href}>
      <Rail label={title}>
        {items.map((item, i) => (
          <RailItem key={`${item.mediaType}-${item.id}`} item={item} index={i} />
        ))}
      </Rail>
    </Section>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  setRequestLocale(rawLocale);
  if (!isTmdbConfigured()) return <SetupNotice />;
  const { t, locale } = await getI18n();

  const results = await Promise.allSettled([
    getTrending("all", "week"),
    getList("movie", "popular"),
    getList("movie", "top_rated"),
    getList("tv", "popular"),
    getList("tv", "top_rated"),
    getList("tv", "on_the_air"),
    discover("movie", { audience: "kids" }),
  ]);

  if (results.every((r) => r.status === "rejected")) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const [trending, popularMovies, topMovies, popularTv, topTv, onAir, kids] = results.map(unwrap);

  const withBackdrop = trending.find((i) => i.backdropPath) ?? trending[0];
  const tiles = trending.filter((i) => i.posterPath && i !== withBackdrop).slice(5, 9);
  const heroItems = trending.filter((i) => i.posterPath && i !== withBackdrop).slice(0, 5);

  return (
    <Container>
      <JsonLd
        data={[
          websiteJsonLd(locale, t("meta.description")),
          itemListJsonLd(locale, t("home.popularMovies"), popularMovies.slice(0, 10)),
        ]}
      />
      <Hero items={heroItems.length >= 3 ? heroItems : trending} />

      {withBackdrop && (
        <Section title={t("home.trending")} href="/movies?sort=popular" className="mt-16 md:mt-20">
          <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
            <Featured item={withBackdrop} />
            {tiles.length > 0 && (
              <ul className="grid grid-cols-2 gap-3">
                {tiles.map((item, i) => (
                  <Reveal as="li" key={`${item.mediaType}-${item.id}`} delay={120 + i * 90}>
                    <MediaTile item={item} />
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      <RailSection title={t("home.popularMovies")} href="/movies" items={popularMovies} />
      <RailSection title={t("home.popularTv")} href="/tv" items={popularTv} />
      <RailSection title={t("home.topMovies")} href="/movies?sort=top_rated" items={topMovies} />
      <RailSection title={t("home.topTv")} href="/tv?sort=top_rated" items={topTv} />
      <RailSection title={t("home.kids")} href="/movies?audience=kids" items={kids} />
      <RailSection title={t("home.onAir")} href="/tv?sort=newest" items={onAir} />
    </Container>
  );
}
