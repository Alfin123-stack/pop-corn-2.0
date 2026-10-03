import type { AudienceFilter, MediaType, SortKey } from "./types";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface BrowseState {
  genre?: number;
  audience: AudienceFilter;
  sort: SortKey;
  page: number;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parsePage(v: string | string[] | undefined): number {
  const n = Number(first(v));
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 500) : 1;
}

export function parseBrowse(sp: SearchParams, type: MediaType): BrowseState {
  const genreRaw = Number(first(sp.genre));
  const audienceRaw = first(sp.audience);
  const sortRaw = first(sp.sort);

  const audiences: AudienceFilter[] = type === "movie" ? ["kids", "teen", "adult"] : ["kids"];
  const audience = audiences.includes(audienceRaw as AudienceFilter)
    ? (audienceRaw as AudienceFilter)
    : "all";
  const sort: SortKey = sortRaw === "top_rated" || sortRaw === "newest" ? sortRaw : "popular";

  return {
    genre: Number.isInteger(genreRaw) && genreRaw > 0 ? genreRaw : undefined,
    audience,
    sort,
    page: parsePage(sp.page),
  };
}

export function browseHref(base: string, state: BrowseState, overrides: Partial<BrowseState> = {}): string {
  const next = { ...state, ...overrides };
  // Any filter change resets pagination unless page is set explicitly.
  if (!("page" in overrides)) next.page = 1;

  const q = new URLSearchParams();
  if (next.genre) q.set("genre", String(next.genre));
  if (next.audience !== "all") q.set("audience", next.audience);
  if (next.sort !== "popular") q.set("sort", next.sort);
  if (next.page > 1) q.set("page", String(next.page));
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
