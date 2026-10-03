import { localizedUrl, SITE_NAME } from "./seo";
import type { Locale } from "./i18n/config";
import type { MediaDetail, MediaSummary } from "./types";
import { tmdbImage } from "./images";

type Json = Record<string, unknown>;

const detailPath = (m: { mediaType: string; id: number }) => `/${m.mediaType}/${m.id}`;

export function websiteJsonLd(locale: Locale, description: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: localizedUrl(locale, "/"),
    description,
    inLanguage: locale,
  };
}

/** ItemList of titles that are visible on the page. Each item is a URL to its own detail page. */
export function itemListJsonLd(locale: Locale, name: string, items: MediaSummary[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: localizedUrl(locale, detailPath(item)),
    })),
  };
}

export function breadcrumbJsonLd(locale: Locale, crumbs: Array<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: localizedUrl(locale, c.path),
    })),
  };
}

/**
 * Movie or TVSeries. `aggregateRating` is included only when the score is shown on the page
 * (it is, next to the stars in the hero), and Google may still choose not to show it.
 */
export function titleJsonLd(locale: Locale, d: MediaDetail): Json {
  const image = tmdbImage(d.posterPath, "w500") ?? tmdbImage(d.backdropPath, "w780");
  const data: Json = {
    "@context": "https://schema.org",
    "@type": d.mediaType === "movie" ? "Movie" : "TVSeries",
    name: d.title,
    url: localizedUrl(locale, detailPath(d)),
    description: d.overview || undefined,
    image: image ?? undefined,
    datePublished: d.date || undefined,
    genre: d.genres.length ? d.genres.map((g) => g.name) : undefined,
    inLanguage: d.originalLanguage || undefined,
    actor: d.cast.length ? d.cast.slice(0, 8).map((c) => ({ "@type": "Person", name: c.name })) : undefined,
    contentRating: d.certification || undefined,
  };

  if (d.mediaType === "movie") {
    if (d.directors.length) data.director = d.directors.map((name) => ({ "@type": "Person", name }));
    if (d.runtime) data.duration = `PT${Math.floor(d.runtime / 60)}H${d.runtime % 60}M`;
  } else {
    if (d.creators.length) data.creator = d.creators.map((name) => ({ "@type": "Person", name }));
    if (d.numberOfSeasons != null) data.numberOfSeasons = d.numberOfSeasons;
    if (d.numberOfEpisodes != null) data.numberOfEpisodes = d.numberOfEpisodes;
  }

  if (d.voteCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(d.voteAverage.toFixed(1)),
      bestRating: 10,
      worstRating: 1,
      ratingCount: d.voteCount,
    };
  }
  if (d.trailerKey && d.date) {
    data.trailer = {
      "@type": "VideoObject",
      name: d.title,
      embedUrl: `https://www.youtube-nocookie.com/embed/${d.trailerKey}`,
      thumbnailUrl: `https://img.youtube.com/vi/${d.trailerKey}/hqdefault.jpg`,
      uploadDate: d.date,
      description: d.overview || d.title,
    };
  }
  return data;
}

