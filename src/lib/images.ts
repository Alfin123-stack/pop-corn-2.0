const TMDB_IMG = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500" | "w780";
export type BackdropSize = "w780" | "w1280";
export type ProfileSize = "w185";
export type StillSize = "w185" | "w300";
export type LogoSize = "w92" | "w154";

export function tmdbImage(
  path: string | null | undefined,
  size: PosterSize | BackdropSize | ProfileSize | StillSize | LogoSize,
): string | null {
  if (!path) return null;
  return `${TMDB_IMG}/${size}${path}`;
}

/**
 * Unsplash photos (free license). Photographers:
 * cinema — Toni Pomar · seats — Geoffrey Moffett · projector — Jason Dent
 * reel — Denise Jans · clapper — GR Stocks · viewer — Krists Luhaers
 */
const PHOTOS = {
  cinema: "photo-1717915604557-94283edbcc1b",
  seats: "photo-1595769816263-9b910be24d5f",
  projector: "photo-1568876694728-451bbf694b83",
  reel: "photo-1543536448-d209d2d13a1c",
  clapper: "photo-1598899134739-24c46f58b8c0",
  viewer: "photo-1517604931442-7e0c8ed2963c",
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export function unsplash(key: PhotoKey, width = 1200): string {
  return `https://images.unsplash.com/${PHOTOS[key]}?auto=format&fit=crop&q=70&w=${width}`;
}
