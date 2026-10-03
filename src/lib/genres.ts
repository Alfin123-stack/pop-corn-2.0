import type { Key } from "./i18n";
import type { MediaType } from "./types";

export interface GenrePage {
  /** URL segment, shared by every language: /movies/genre/sci-fi */
  slug: string;
  /** TMDB genre id. */
  id: number;
  label: Key;
}

/** Genres that get their own indexable landing page. Everything else stays a filter on /movies or /tv. */
export const GENRE_PAGES: Record<MediaType, GenrePage[]> = {
  movie: [
    { slug: "action", id: 28, label: "genre.action" },
    { slug: "adventure", id: 12, label: "genre.adventure" },
    { slug: "animation", id: 16, label: "genre.animation" },
    { slug: "comedy", id: 35, label: "genre.comedy" },
    { slug: "crime", id: 80, label: "genre.crime" },
    { slug: "documentary", id: 99, label: "genre.documentary" },
    { slug: "drama", id: 18, label: "genre.drama" },
    { slug: "family", id: 10751, label: "genre.family" },
    { slug: "fantasy", id: 14, label: "genre.fantasy" },
    { slug: "horror", id: 27, label: "genre.horror" },
    { slug: "mystery", id: 9648, label: "genre.mystery" },
    { slug: "romance", id: 10749, label: "genre.romance" },
    { slug: "sci-fi", id: 878, label: "genre.scifi" },
    { slug: "thriller", id: 53, label: "genre.thriller" },
  ],
  tv: [
    { slug: "action-adventure", id: 10759, label: "genre.actionAdventure" },
    { slug: "animation", id: 16, label: "genre.animation" },
    { slug: "comedy", id: 35, label: "genre.comedy" },
    { slug: "crime", id: 80, label: "genre.crime" },
    { slug: "documentary", id: 99, label: "genre.documentary" },
    { slug: "drama", id: 18, label: "genre.drama" },
    { slug: "family", id: 10751, label: "genre.family" },
    { slug: "mystery", id: 9648, label: "genre.mystery" },
    { slug: "reality", id: 10764, label: "genre.reality" },
    { slug: "sci-fi-fantasy", id: 10765, label: "genre.scifiFantasy" },
  ],
};

export function genreBySlug(type: MediaType, slug: string): GenrePage | undefined {
  return GENRE_PAGES[type].find((g) => g.slug === slug);
}

export function genreById(type: MediaType, id: number): GenrePage | undefined {
  return GENRE_PAGES[type].find((g) => g.id === id);
}

export const browseBase = (type: MediaType) => (type === "movie" ? "/movies" : "/tv");

export function genrePath(type: MediaType, slug: string): string {
  return `${browseBase(type)}/genre/${slug}`;
}
