import "server-only";

import { audienceFromCertification } from "./certification";
import { LOCALE_META, type Locale } from "./i18n/config";
import { getLocale } from "./i18n/server";
import type {
  AudienceFilter,
  CastMember,
  EpisodeRef,
  EpisodeSummary,
  Genre,
  MediaDetail,
  MediaSummary,
  MediaType,
  Paged,
  SeasonSummary,
  SortKey,
  VideoItem,
  WatchProvider,
  WatchProviders,
} from "./types";

const BASE = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";

/** Country used for age ratings and "where to watch". */
export const REGION = (process.env.TMDB_REGION ?? "US").toUpperCase();

/** TMDB certification filters only work with a country that has a rating scale; US is the most complete. */
const FILTER_COUNTRY = "US";

const KIDS_TV_GENRES = "10762|10751"; // Kids | Family

export class TmdbConfigError extends Error {
  constructor() {
    super("TMDB_API_KEY is not set");
    this.name = "TmdbConfigError";
  }
}

export class TmdbError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

type Params = Record<string, string | number | boolean | undefined>;

const HOUR = 3600;

/**
 * `locale` picks the language TMDB writes titles, synopses and genres in. Server components leave it
 * out and get the visitor's cookie; API routes pass it explicitly so their responses stay cacheable per URL.
 */
async function tmdb<T>(path: string, params: Params = {}, revalidate = HOUR, locale?: Locale): Promise<T> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) throw new TmdbConfigError();

  const url = new URL(`${BASE}${path}`);
  const isToken = key.startsWith("eyJ"); // v4 read access token (JWT)
  const activeLocale = locale ?? (await getLocale());
  url.searchParams.set("language", LOCALE_META[activeLocale].tmdb);
  if (!isToken) url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (isToken) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, { headers, next: { revalidate } });
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as { status_message?: string };
      if (body.status_message) message = body.status_message;
    } catch {
      // ignore body parse errors
    }
    throw new TmdbError(res.status, message);
  }
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Raw shapes (only what we read)                                       */
/* ------------------------------------------------------------------ */

interface RawListItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

interface RawPage<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

interface RawProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface RawEpisodeRef {
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime?: number | null;
}

interface RawDetail extends RawListItem {
  tagline?: string;
  status?: string;
  genres?: Genre[];
  runtime?: number | null;
  episode_run_time?: number[];
  original_language?: string;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string }>;
  production_companies?: Array<{ name: string }>;
  networks?: Array<{ name: string }>;
  homepage?: string | null;
  budget?: number;
  revenue?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_air_date?: string | null;
  in_production?: boolean;
  created_by?: Array<{ name: string }>;
  seasons?: Array<{
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    overview: string;
  }>;
  next_episode_to_air?: RawEpisodeRef | null;
  last_episode_to_air?: RawEpisodeRef | null;
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profile_path: string | null }>;
    crew?: Array<{ id: number; name: string; job: string }>;
  };
  videos?: { results?: Array<{ key: string; name?: string; site: string; type: string; official?: boolean }> };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string; type: number }>;
    }>;
  };
  content_ratings?: { results?: Array<{ iso_3166_1: string; rating: string }> };
  recommendations?: RawPage<RawListItem>;
  "watch/providers"?: {
    results?: Record<
      string,
      { link?: string; flatrate?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] }
    >;
  };
}

/* ------------------------------------------------------------------ */
/* Normalizers                                                          */
/* ------------------------------------------------------------------ */

function toSummary(raw: RawListItem, fallback?: MediaType): MediaSummary | null {
  const type = raw.media_type ?? fallback;
  if (type !== "movie" && type !== "tv") return null;
  return {
    id: raw.id,
    mediaType: type,
    title: (type === "movie" ? raw.title : raw.name) ?? raw.title ?? raw.name ?? "Untitled",
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    date: (type === "movie" ? raw.release_date : raw.first_air_date) || null,
    genreIds: raw.genre_ids ?? [],
  };
}

function toSummaries(items: RawListItem[] | undefined, fallback?: MediaType): MediaSummary[] {
  return (items ?? [])
    .map((r) => toSummary(r, fallback))
    .filter((r): r is MediaSummary => r !== null);
}

function toPaged(raw: RawPage<RawListItem>, fallback?: MediaType): Paged<MediaSummary> {
  return {
    page: raw.page,
    // TMDB serves at most 500 pages.
    totalPages: Math.min(raw.total_pages, 500),
    totalResults: raw.total_results,
    results: toSummaries(raw.results, fallback),
  };
}

function countryOrder(available: string[]): string[] {
  const preferred = [REGION, "US", "GB", "ID"].filter((c) => available.includes(c));
  return [...new Set([...preferred, ...available])];
}

function pickMovieCertification(raw: RawDetail["release_dates"]) {
  const results = raw?.results ?? [];
  for (const country of countryOrder(results.map((r) => r.iso_3166_1))) {
    const entry = results.find((r) => r.iso_3166_1 === country);
    const dated = (entry?.release_dates ?? []).filter((d) => d.certification?.trim());
    if (dated.length > 0) {
      const theatrical = dated.find((d) => d.type === 3) ?? dated[0];
      return { certification: theatrical.certification.trim(), country };
    }
  }
  return null;
}

function pickTvCertification(raw: RawDetail["content_ratings"]) {
  const results = raw?.results ?? [];
  for (const country of countryOrder(results.map((r) => r.iso_3166_1))) {
    const entry = results.find((r) => r.iso_3166_1 === country);
    if (entry?.rating?.trim()) return { certification: entry.rating.trim(), country };
  }
  return null;
}

function toProviders(raw: RawDetail["watch/providers"]): WatchProviders | null {
  const region = raw?.results?.[REGION];
  if (!region) return null;
  const map = (list?: RawProvider[]): WatchProvider[] =>
    (list ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  const providers: WatchProviders = {
    link: region.link ?? null,
    stream: map(region.flatrate),
    rent: map(region.rent),
    buy: map(region.buy),
  };
  if (!providers.stream.length && !providers.rent.length && !providers.buy.length) return null;
  return providers;
}

function toEpisodeRef(raw: RawEpisodeRef | null | undefined): EpisodeRef | null {
  if (!raw) return null;
  return {
    seasonNumber: raw.season_number,
    episodeNumber: raw.episode_number,
    name: raw.name,
    airDate: raw.air_date ?? null,
  };
}

function pickTrailer(videos: RawDetail["videos"]): string | null {
  const youtube = (videos?.results ?? []).filter((v) => v.site === "YouTube");
  const best =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser");
  return best?.key ?? null;
}

const VIDEO_ORDER = ["Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes", "Bloopers"];

/** YouTube videos worth showing in the trailer player: best first (the first one matches pickTrailer), at most 8. */
function pickVideos(videos: RawDetail["videos"]): VideoItem[] {
  const seen = new Set<string>();
  const picked: Array<NonNullable<NonNullable<RawDetail["videos"]>["results"]>[number]> = [];
  for (const v of videos?.results ?? []) {
    if (v.site !== "YouTube" || !VIDEO_ORDER.includes(v.type) || seen.has(v.key)) continue;
    seen.add(v.key);
    picked.push(v);
  }
  return picked
    .sort((a, b) => VIDEO_ORDER.indexOf(a.type) - VIDEO_ORDER.indexOf(b.type) || Number(!!b.official) - Number(!!a.official))
    .slice(0, 8)
    .map((v) => ({ key: v.key, name: v.name || v.type, type: v.type }));
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export async function getTrending(
  type: "all" | MediaType = "all",
  window: "day" | "week" = "week",
): Promise<MediaSummary[]> {
  const raw = await tmdb<RawPage<RawListItem>>(`/trending/${type}/${window}`);
  return toSummaries(raw.results, type === "all" ? undefined : type);
}

export type ListKey =
  | "popular"
  | "top_rated"
  | "now_playing"
  | "upcoming"
  | "on_the_air"
  | "airing_today";

export async function getList(type: MediaType, list: ListKey, page = 1): Promise<Paged<MediaSummary>> {
  const raw = await tmdb<RawPage<RawListItem>>(`/${type}/${list}`, { page });
  return toPaged(raw, type);
}

export interface DiscoverOptions {
  genre?: number;
  audience?: AudienceFilter;
  sort?: SortKey;
  page?: number;
}

export async function discover(
  type: MediaType,
  { genre, audience = "all", sort = "popular", page = 1 }: DiscoverOptions = {},
): Promise<Paged<MediaSummary>> {
  const today = new Date().toISOString().slice(0, 10);
  const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
  const params: Params = { page, include_adult: false, include_video: false };

  if (sort === "popular") {
    params.sort_by = "popularity.desc";
  } else if (sort === "top_rated") {
    params.sort_by = "vote_average.desc";
    params["vote_count.gte"] = type === "movie" ? 500 : 200;
  } else {
    params.sort_by = `${dateField}.desc`;
    params[`${dateField}.lte`] = today;
    params["vote_count.gte"] = 5;
  }

  if (type === "movie") {
    if (genre) params.with_genres = genre;
    if (audience !== "all") {
      params.certification_country = FILTER_COUNTRY;
      if (audience === "kids") params["certification.lte"] = "PG";
      if (audience === "teen") params.certification = "PG-13";
      if (audience === "adult") params["certification.gte"] = "R";
    }
  } else if (audience === "kids") {
    // TV discover has no certification filter, so "kids" is genre based.
    params.with_genres = KIDS_TV_GENRES;
  } else if (genre) {
    params.with_genres = genre;
  }

  const raw = await tmdb<RawPage<RawListItem>>(`/discover/${type}`, params);
  return toPaged(raw, type);
}

export async function search(
  query: string,
  type: "all" | MediaType = "all",
  page = 1,
  locale?: Locale,
): Promise<Paged<MediaSummary>> {
  const endpoint = type === "all" ? "multi" : type;
  const raw = await tmdb<RawPage<RawListItem>>(
    `/search/${endpoint}`,
    { query, page, include_adult: false },
    300,
    locale,
  );
  return toPaged(raw, type === "all" ? undefined : type);
}

/** Filters the AI assistant can combine. Everything is optional except the media type. */
export interface AdvancedDiscover {
  type: MediaType;
  genreIds?: number[];
  excludeGenreIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  minVotes?: number;
  minRuntime?: number;
  maxRuntime?: number;
  originCountry?: string;
  originalLanguage?: string;
  keywordIds?: number[];
  audience?: AudienceFilter;
  sort?: SortKey;
}

export async function discoverAdvanced(f: AdvancedDiscover, locale: Locale): Promise<MediaSummary[]> {
  const type = f.type;
  const today = new Date().toISOString().slice(0, 10);
  const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
  const sort = f.sort ?? "popular";
  const params: Params = { page: 1, include_adult: false, include_video: false };

  if (sort === "top_rated") {
    params.sort_by = "vote_average.desc";
    params["vote_count.gte"] = f.minVotes ?? (type === "movie" ? 300 : 150);
  } else if (sort === "newest") {
    params.sort_by = `${dateField}.desc`;
    params["vote_count.gte"] = f.minVotes ?? 5;
  } else {
    params.sort_by = "popularity.desc";
    if (f.minVotes) params["vote_count.gte"] = f.minVotes;
  }

  if (f.yearFrom) params[`${dateField}.gte`] = `${f.yearFrom}-01-01`;
  const upper = f.yearTo ? `${f.yearTo}-12-31` : undefined;
  // "Newest" must never list unreleased titles.
  params[`${dateField}.lte`] = sort === "newest" && (!upper || upper > today) ? today : upper;

  if (f.minRating) {
    params["vote_average.gte"] = f.minRating;
    if (params["vote_count.gte"] === undefined) params["vote_count.gte"] = 100;
  }
  if (f.minRuntime) params["with_runtime.gte"] = f.minRuntime;
  if (f.maxRuntime) params["with_runtime.lte"] = f.maxRuntime;
  if (f.originCountry) params.with_origin_country = f.originCountry.toUpperCase();
  if (f.originalLanguage) params.with_original_language = f.originalLanguage.toLowerCase();
  if (f.genreIds?.length) params.with_genres = f.genreIds.join(","); // comma = all of them
  if (f.excludeGenreIds?.length) params.without_genres = f.excludeGenreIds.join(",");
  if (f.keywordIds?.length) params.with_keywords = f.keywordIds.join("|"); // pipe = any of them

  const audience = f.audience ?? "all";
  if (type === "movie") {
    if (audience !== "all") {
      params.certification_country = FILTER_COUNTRY;
      if (audience === "kids") params["certification.lte"] = "PG";
      if (audience === "teen") params.certification = "PG-13";
      if (audience === "adult") params["certification.gte"] = "R";
    }
  } else if (audience === "kids") {
    params.with_genres = KIDS_TV_GENRES; // TV discover has no certification filter
  }

  const raw = await tmdb<RawPage<RawListItem>>(`/discover/${type}`, params, HOUR, locale);
  return toPaged(raw, type).results.slice(0, 12);
}

export async function searchKeywords(query: string, locale: Locale): Promise<Array<{ id: number; name: string }>> {
  const raw = await tmdb<{ results?: Array<{ id: number; name: string }> }>(
    "/search/keyword",
    { query, page: 1 },
    HOUR,
    locale,
  );
  return (raw.results ?? []).slice(0, 5);
}

/** Titles people also like. Falls back to TMDB's "similar" list when there are no recommendations yet. */
export async function getRecommendations(type: MediaType, id: number, locale: Locale): Promise<MediaSummary[]> {
  const first = await tmdb<RawPage<RawListItem>>(`/${type}/${id}/recommendations`, { page: 1 }, 6 * HOUR, locale);
  let items = toSummaries(first.results, type);
  if (items.length === 0) {
    const similar = await tmdb<RawPage<RawListItem>>(`/${type}/${id}/similar`, { page: 1 }, 6 * HOUR, locale);
    items = toSummaries(similar.results, type);
  }
  return items.slice(0, 10);
}

export async function getGenres(type: MediaType): Promise<Genre[]> {
  const raw = await tmdb<{ genres: Genre[] }>(`/genre/${type}/list`, {}, 24 * HOUR);
  return raw.genres;
}

export async function getDetail(type: MediaType, id: number, localeOverride?: Locale): Promise<MediaDetail> {
  const append =
    type === "movie"
      ? "credits,videos,release_dates,recommendations,watch/providers"
      : "credits,videos,content_ratings,recommendations,watch/providers";

  const locale = localeOverride ?? (await getLocale());
  const raw = await tmdb<RawDetail>(
    `/${type}/${id}`,
    { append_to_response: append, include_video_language: [...new Set([locale, "en", "null"])].join(",") },
    6 * HOUR,
    locale,
  );

  // Many titles have no translated synopsis yet. Fall back to English rather than showing nothing.
  if (locale !== "en" && (!raw.overview || !raw.tagline)) {
    try {
      const english = await tmdb<RawDetail>(`/${type}/${id}`, {}, 6 * HOUR, "en");
      if (!raw.overview) raw.overview = english.overview;
      if (!raw.tagline) raw.tagline = english.tagline;
    } catch {
      // The localized page is still usable without the fallback.
    }
  }

  const summary = toSummary({ ...raw, media_type: type }, type);
  if (!summary) throw new TmdbError(404, "Not found");

  const cert =
    type === "movie" ? pickMovieCertification(raw.release_dates) : pickTvCertification(raw.content_ratings);

  const runtime =
    type === "movie"
      ? raw.runtime || null
      : raw.episode_run_time?.find((n) => n > 0) ?? raw.last_episode_to_air?.runtime ?? null;

  const cast: CastMember[] = (raw.credits?.cast ?? []).slice(0, 14).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? "",
    profilePath: c.profile_path,
  }));

  const directors = [
    ...new Set((raw.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name)),
  ].slice(0, 3);

  const seasons: SeasonSummary[] = (raw.seasons ?? []).map((s) => ({
    id: s.id,
    seasonNumber: s.season_number,
    name: s.name,
    episodeCount: s.episode_count,
    airDate: s.air_date,
    posterPath: s.poster_path,
    overview: s.overview,
  }));

  return {
    ...summary,
    tagline: raw.tagline ?? "",
    status: raw.status ?? "",
    genres: raw.genres ?? [],
    runtime,
    certification: cert?.certification ?? null,
    certificationCountry: cert?.country ?? null,
    audience: audienceFromCertification(cert?.certification),
    originalLanguage: raw.original_language ?? "",
    spokenLanguages: (raw.spoken_languages ?? []).map((l) => l.english_name).filter(Boolean),
    companies: (raw.production_companies ?? []).map((c) => c.name).slice(0, 4),
    networks: (raw.networks ?? []).map((n) => n.name).slice(0, 4),
    homepage: raw.homepage || null,
    budget: raw.budget || null,
    revenue: raw.revenue || null,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    lastAirDate: raw.last_air_date ?? null,
    inProduction: raw.in_production ?? null,
    seasons,
    nextEpisode: toEpisodeRef(raw.next_episode_to_air),
    lastEpisode: toEpisodeRef(raw.last_episode_to_air),
    creators: (raw.created_by ?? []).map((c) => c.name),
    directors,
    cast,
    trailerKey: pickTrailer(raw.videos),
    videos: pickVideos(raw.videos),
    providers: toProviders(raw["watch/providers"]),
    recommendations: toSummaries(raw.recommendations?.results, type).slice(0, 20),
  };
}

export async function getSeason(
  tvId: number,
  seasonNumber: number,
  locale?: Locale,
): Promise<EpisodeSummary[]> {
  const raw = await tmdb<{
    episodes?: Array<{
      id: number;
      episode_number: number;
      name: string;
      overview: string;
      air_date: string | null;
      runtime: number | null;
      vote_average: number;
      still_path: string | null;
    }>;
  }>(`/tv/${tvId}/season/${seasonNumber}`, {}, 6 * HOUR, locale);

  return (raw.episodes ?? []).map((e) => ({
    id: e.id,
    number: e.episode_number,
    name: e.name,
    overview: e.overview ?? "",
    airDate: e.air_date,
    runtime: e.runtime,
    voteAverage: e.vote_average ?? 0,
    stillPath: e.still_path,
  }));
}