import Image from "next/image";
import type { ReactNode } from "react";
import Link from "@/components/locale-link";
import { ExternalLink } from "lucide-react";
import {
  formatDate,
  formatLanguage,
  formatMoney,
  formatRuntime,
  formatScore,
  formatVotes,
  vars,
} from "@/lib/format";
import { browseBase, genreById, genrePath } from "@/lib/genres";
import { statusLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { tmdbImage, unsplash } from "@/lib/images";
import type { MediaDetail, WatchProvider } from "@/lib/types";
import { AddToWatched } from "./add-to-watched";
import { BackButton } from "./back-button";
import { CertBadges, Pill } from "./badges";
import { Container } from "./container";
import { Img } from "./img";
import { Parallax } from "./parallax";
import { Reveal } from "./reveal";
import { RailItem } from "./media-card";
import { Rail } from "./rail";
import { Section } from "./section";
import { SeasonPanel } from "./season-panel";
import { Stars } from "./stars";
import { TrailerButton } from "./trailer-button";

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="t-body mt-0.5">{value}</dd>
    </div>
  );
}

function ProviderRow({ label, providers }: { label: string; providers: WatchProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <h3 className="t-meta text-muted">{label}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {providers.map((p) => {
          const logo = tmdbImage(p.logoPath, "w92");
          return (
            <li key={p.id} title={p.name} className="relative size-11 overflow-hidden rounded-xl bg-canvas transition-transform duration-300 ease-spring hover:-translate-y-1 hover:scale-110">
              {logo ? (
                <Image src={logo} alt={p.name} fill sizes="44px" unoptimized className="object-cover" />
              ) : (
                <span className="t-caption grid size-full place-items-center px-1 text-center">{p.name}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function DetailView({ detail, breadcrumbs }: { detail: MediaDetail; breadcrumbs?: ReactNode }) {
  const { t, tp, locale } = await getI18n();
  const isTv = detail.mediaType === "tv";
  const runtime = formatRuntime(detail.runtime, locale);
  const backdrop = tmdbImage(detail.backdropPath, "w1280") ?? unsplash("cinema", 1600);
  const poster = tmdbImage(detail.posterPath, "w500");
  const released = formatDate(detail.date, locale);
  const status = detail.status ? statusLabel(t, detail.status) : "";
  const year = detail.date?.slice(0, 4);

  const seasonsLabel = detail.numberOfSeasons != null ? tp("detail.season", detail.numberOfSeasons) : null;
  const episodesLabel = detail.numberOfEpisodes != null ? tp("detail.episode", detail.numberOfEpisodes) : null;

  const watchedDraft = {
    id: detail.id,
    mediaType: detail.mediaType,
    title: detail.title,
    posterPath: detail.posterPath,
    date: detail.date,
    certification: detail.certification,
    audience: detail.audience,
    runtime: detail.runtime,
    numberOfSeasons: detail.numberOfSeasons,
    voteAverage: detail.voteAverage,
  };

  const people = isTv ? detail.creators : detail.directors;
  const hasProviders = detail.providers !== null;

  return (
    <Container className="pt-6 md:pt-8">
      {breadcrumbs}
      {/* Hero: the image is the card. Backdrop settles in and drifts slower than the page. */}
      <div className="relative min-h-[clamp(22rem,calc(45vw_+_8rem),34rem)] overflow-hidden rounded-card bg-slate-ink shadow-soft">
        <Parallax className="absolute inset-x-0 -bottom-16 -top-8">
          <Img src={backdrop} alt="" sizes="(min-width: 1200px) 1152px, 100vw" priority className="anim-settle" />
        </Parallax>
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col justify-between gap-6 p-5 text-white sm:p-8 lg:p-10">
          <div>
            <BackButton
              fallbackHref={isTv ? "/tv" : "/movies"}
              className="anim-rise mb-5 bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
            />
            <p className="t-meta anim-rise text-white/80" style={vars({ "--d": "150ms" })}>
              {isTv ? t("media.tv") : t("media.movie")}
              {year ? `, ${year}` : ""}
            </p>
            <h1 className="t-headline anim-rise mt-2 max-w-[20ch] text-balance" style={vars({ "--d": "260ms" })}>
              {detail.title}
            </h1>
            {detail.tagline && (
              <p className="t-lead anim-rise mt-3 max-w-[48ch] text-white/85" style={vars({ "--d": "380ms" })}>
                {detail.tagline}
              </p>
            )}
            {detail.voteCount > 0 && (
              <div className="t-body anim-rise mt-4 flex items-center gap-2" style={vars({ "--d": "480ms" })}>
                <Stars value={detail.voteAverage} size={15} />
                <span>
                  {t("media.votes", {
                    score: formatScore(detail.voteAverage, locale),
                    votes: formatVotes(detail.voteCount, locale),
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="stagger flex flex-wrap items-center gap-2" style={vars({ "--stagger-base": "620ms" })}>
            <CertBadges certification={detail.certification} audience={detail.audience} tone="white" />
            {runtime && <Pill tone="white">{isTv ? t("detail.perEpisode", { runtime }) : runtime}</Pill>}
            {seasonsLabel && <Pill tone="white">{seasonsLabel}</Pill>}
            {episodesLabel && <Pill tone="white">{episodesLabel}</Pill>}
            {status && <Pill tone="white">{status}</Pill>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="order-2 space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0 lg:order-1 lg:block lg:space-y-4">
          {poster && (
            <Reveal className="hidden lg:block">
              <div className="group rounded-card bg-surface p-2 shadow-soft transition-shadow duration-500 hover:shadow-float">
                <div className="relative aspect-[2/3] overflow-hidden rounded-inner bg-canvas">
                  <Img src={poster} alt={t("media.poster", { title: detail.title })} sizes="300px" hoverZoom="sm" />
                </div>
              </div>
            </Reveal>
          )}
          <Reveal delay={80}>
            <AddToWatched draft={watchedDraft} />
          </Reveal>
          <Reveal delay={140}>
          <div className="rounded-card bg-surface p-5 shadow-soft">
            <h2 className="t-strong">{t("detail.details")}</h2>
            <dl className="mt-3 divide-y divide-hairline">
              <Fact label={isTv ? t("detail.firstAired") : t("detail.releaseDate")} value={released} />
              {isTv && <Fact label={t("detail.lastAired")} value={formatDate(detail.lastAirDate, locale)} />}
              <Fact label={t("detail.status")} value={status} />
              {isTv && <Fact label={t("detail.seasons")} value={seasonsLabel} />}
              {isTv && <Fact label={t("detail.episodes")} value={episodesLabel} />}
              <Fact label={isTv ? t("detail.episodeLength") : t("detail.runtime")} value={runtime} />
              <Fact
                label={
                  detail.certificationCountry
                    ? t("detail.ageRatingIn", { country: detail.certificationCountry })
                    : t("detail.ageRating")
                }
                value={detail.certification}
              />
              <Fact label={isTv ? t("detail.createdBy") : t("detail.directedBy")} value={people.join(", ")} />
              {isTv && <Fact label={t("detail.networks")} value={detail.networks.join(", ")} />}
              <Fact label={t("detail.studios")} value={detail.companies.join(", ")} />
              <Fact
                label={t("detail.originalLanguage")}
                value={detail.originalLanguage ? formatLanguage(detail.originalLanguage, locale) : null}
              />
              <Fact label={t("detail.spokenLanguages")} value={detail.spokenLanguages.join(", ")} />
              {!isTv && <Fact label={t("detail.budget")} value={formatMoney(detail.budget, locale)} />}
              {!isTv && <Fact label={t("detail.revenue")} value={formatMoney(detail.revenue, locale)} />}
            </dl>
          </div>
          </Reveal>
        </aside>

        {/* Main column */}
        <div className="order-1 min-w-0 space-y-10 lg:order-2">
          <div>
            {detail.genres.length > 0 && (
              <ul className="stagger flex flex-wrap gap-2" aria-label={t("detail.genres")} style={vars({ "--stagger-base": "300ms" })}>
                {detail.genres.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={
                        genreById(detail.mediaType, g.id)
                          ? genrePath(detail.mediaType, genreById(detail.mediaType, g.id)!.slug)
                          : `${browseBase(detail.mediaType)}?genre=${g.id}`
                      }
                      className="t-body inline-flex min-h-8 items-center rounded-full border border-hairline bg-surface px-4 py-1.5 shadow-pill pointer-coarse:min-h-11 transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ink hover:shadow-float"
                    >
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="t-display anim-rise mt-6" style={vars({ "--d": "420ms" })}>
              {t("detail.synopsis")}
            </h2>
            <p className="t-lead anim-rise mt-3 max-w-[68ch]" style={vars({ "--d": "500ms" })}>
              {detail.overview || t("detail.noSynopsis")}
            </p>
            <p className="t-body mt-4 text-muted">
              {detail.certification
                ? `${
                    detail.certificationCountry
                      ? t("detail.ratedIn", { cert: detail.certification, country: detail.certificationCountry })
                      : t("detail.rated", { cert: detail.certification })
                  } ${t(`audhint.${detail.audience}`)}.`
                : `${t("audhint.unrated")}.`}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {detail.trailerKey && (
                <TrailerButton
                  youtubeKey={detail.trailerKey}
                  title={detail.title}
                  year={detail.date?.slice(0, 4)}
                  backdropPath={detail.backdropPath}
                  videos={detail.videos}
                />
              )}
              {detail.homepage && (
                <a
                  href={detail.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-strong inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-surface px-5 py-2.5 shadow-pill transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-float"
                >
                  {t("detail.officialSite")}
                  <ExternalLink aria-hidden className="size-4" />
                </a>
              )}
            </div>
          </div>

          {isTv && detail.seasons.length > 0 && (
            <Reveal as="section">
              <h2 className="t-display mb-4">{t("detail.seasonsAndEpisodes")}</h2>
              <SeasonPanel tvId={detail.id} seasons={detail.seasons} nextEpisode={detail.nextEpisode} />
            </Reveal>
          )}

          {detail.cast.length > 0 && (
            <Reveal as="section">
              <h2 className="t-display mb-4">{t("detail.cast")}</h2>
              <ul className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                {detail.cast.map((c, i) => {
                  const profile = tmdbImage(c.profilePath, "w185");
                  return (
                    <li
                      key={c.id}
                      className="group w-[5.75rem] shrink-0 snap-start transition-transform duration-300 ease-out-expo hover:-translate-y-1"
                      style={vars({ "--d": `${i * 45}ms` })}
                    >
                      <div className="relative size-[5.75rem] overflow-hidden rounded-xl bg-canvas shadow-pill">
                        <Img src={profile} alt={c.name} sizes="92px" className="object-top" hoverZoom="md" />
                      </div>
                      <p className="t-meta mt-2 line-clamp-2">{c.name}</p>
                      {c.character && <p className="t-caption line-clamp-2 text-muted">{c.character}</p>}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}

          {hasProviders && detail.providers && (
            <Reveal as="section">
              <h2 className="t-display mb-4">{t("detail.whereToWatch")}</h2>
              <div className="space-y-4 rounded-card bg-surface p-5 shadow-soft">
                <ProviderRow label={t("detail.stream")} providers={detail.providers.stream} />
                <ProviderRow label={t("detail.rent")} providers={detail.providers.rent} />
                <ProviderRow label={t("detail.buy")} providers={detail.providers.buy} />
                <p className="t-caption text-muted">{t("detail.justwatch")}</p>
              </div>
            </Reveal>
          )}
        </div>
      </div>

      {detail.recommendations.length > 0 && (
        <Section title={t("detail.moreLikeThis")}>
          <Rail label={t("detail.recommendations")}>
            {detail.recommendations.map((item, i) => (
              <RailItem key={`${item.mediaType}-${item.id}`} item={item} index={i} />
            ))}
          </Rail>
        </Section>
      )}
    </Container>
  );
}