import "server-only";

import { parseBrowse, type SearchParams } from "./browse";
import { browseBase, genreById, genrePath, type GenrePage } from "./genres";
import type { Locale } from "./i18n/config";
import { getI18n } from "./i18n/server";
import { buildMetadata } from "./seo";
import type { MediaType } from "./types";

function withPage(title: string, page: number, label: string): string {
  return page > 1 ? `${title} (${label})` : title;
}

/**
 * Metadata for /movies and /tv.
 * - Filter and sort variants share the base page's canonical, so they never compete with it.
 * - `?genre=X` on its own points at that genre's landing page when one exists.
 * - Pages 2 and up are noindex,follow: crawlable, but kept out of results.
 */
export async function browseMetadata({
  type,
  locale,
  searchParams,
}: {
  type: MediaType;
  locale: Locale;
  searchParams: SearchParams;
}) {
  const { t } = await getI18n();
  const state = parseBrowse(searchParams, type);
  const base = browseBase(type);
  const otherFilters = state.audience !== "all" || state.sort !== "popular";
  const landing = state.genre && !otherFilters ? genreById(type, state.genre) : undefined;

  const target = landing ? genrePath(type, landing.slug) : base;
  const clean = !otherFilters && (!state.genre || Boolean(landing));
  const canonicalPath = state.page > 1 && clean ? `${target}?page=${state.page}` : target;

  const title = landing
    ? t(type === "movie" ? "genrePage.movieTitle" : "genrePage.tvTitle", { genre: t(landing.label) })
    : t(type === "movie" ? "seo.moviesTitle" : "seo.tvTitle");

  return buildMetadata({
    locale,
    path: canonicalPath,
    canonicalPath,
    title: withPage(title, state.page, t("seo.page", { n: state.page })),
    description: landing
      ? t(type === "movie" ? "genrePage.movieDesc" : "genrePage.tvDesc", { genre: t(landing.label) })
      : t(type === "movie" ? "seo.moviesDesc" : "seo.tvDesc"),
    noindex: state.page > 1,
  });
}

/** Metadata for /movies/genre/[slug] and /tv/genre/[slug]. */
export async function genreBrowseMetadata({
  type,
  locale,
  genre,
  searchParams,
}: {
  type: MediaType;
  locale: Locale;
  genre: GenrePage;
  searchParams: SearchParams;
}) {
  const { t } = await getI18n();
  const state = parseBrowse(searchParams, type);
  const target = genrePath(type, genre.slug);
  const otherFilters = state.audience !== "all" || state.sort !== "popular";
  const canonicalPath = state.page > 1 && !otherFilters ? `${target}?page=${state.page}` : target;
  const name = t(genre.label);
  const title = t(type === "movie" ? "genrePage.movieTitle" : "genrePage.tvTitle", { genre: name });

  return buildMetadata({
    locale,
    path: canonicalPath,
    canonicalPath,
    title: withPage(title, state.page, t("seo.page", { n: state.page })),
    description: t(type === "movie" ? "genrePage.movieDesc" : "genrePage.tvDesc", { genre: name }),
    noindex: state.page > 1,
  });
}
