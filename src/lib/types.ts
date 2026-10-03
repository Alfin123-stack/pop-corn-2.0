export type MediaType = "movie" | "tv";
export type Audience = "kids" | "teen" | "adult" | "unrated";

export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  /** Release date (movie) or first air date (TV), ISO string. */
  date: string | null;
  genreIds: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  link: string | null;
  stream: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface SeasonSummary {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
}

export interface EpisodeSummary {
  id: number;
  number: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  voteAverage: number;
  stillPath: string | null;
}

export interface EpisodeRef {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string | null;
}

/** A YouTube video attached to a title, already ordered: official trailer first, then teasers, clips... */
export interface VideoItem {
  key: string;
  name: string;
  type: string;
}

export interface MediaDetail extends MediaSummary {
  tagline: string;
  status: string;
  genres: Genre[];
  /** Minutes. Movie runtime, or typical episode runtime for TV. */
  runtime: number | null;
  certification: string | null;
  certificationCountry: string | null;
  audience: Audience;
  originalLanguage: string;
  spokenLanguages: string[];
  companies: string[];
  networks: string[];
  homepage: string | null;
  budget: number | null;
  revenue: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  lastAirDate: string | null;
  inProduction: boolean | null;
  seasons: SeasonSummary[];
  nextEpisode: EpisodeRef | null;
  lastEpisode: EpisodeRef | null;
  creators: string[];
  directors: string[];
  cast: CastMember[];
  trailerKey: string | null;
  videos: VideoItem[];
  providers: WatchProviders | null;
  recommendations: MediaSummary[];
}

export interface Paged<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export type SortKey = "popular" | "top_rated" | "newest";
export type AudienceFilter = "all" | "kids" | "teen" | "adult";

export interface Suggestion {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  voteAverage: number;
}