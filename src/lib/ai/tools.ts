import type { Locale } from "@/lib/i18n/config";
import {
  discoverAdvanced,
  getDetail,
  getRecommendations,
  search,
  searchKeywords,
  type AdvancedDiscover,
} from "@/lib/tmdb";
import type { AudienceFilter, MediaSummary, MediaType, SortKey } from "@/lib/types";
import type { GeminiToolDeclaration } from "./gemini";
import type { AiStatusKey } from "./types";

/** TMDB genre ids. Listed in the prompt so the model can filter without a lookup round trip. */
export const GENRE_IDS = {
  movie: "Action 28, Adventure 12, Animation 16, Comedy 35, Crime 80, Documentary 99, Drama 18, Family 10751, Fantasy 14, History 36, Horror 27, Music 10402, Mystery 9648, Romance 10749, Science Fiction 878, TV Movie 10770, Thriller 53, War 10752, Western 37",
  tv: "Action & Adventure 10759, Animation 16, Comedy 35, Crime 80, Documentary 99, Drama 18, Family 10751, Kids 10762, Mystery 9648, News 10763, Reality 10764, Sci-Fi & Fantasy 10765, Soap 10766, Talk 10767, War & Politics 10768, Western 37",
} as const;

const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure",
  10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk",
  10768: "War & Politics",
};

const typeEnum = { type: "string", enum: ["movie", "tv"] };

/** The model answers by calling `present_picks`; every other tool only reads from TMDB. */
export const FINAL_TOOL = "present_picks";

export const TOOLS: GeminiToolDeclaration[] = [
  {
    name: "search_titles",
    description:
      "Search TMDB by title, person or phrase. Use it when the visitor names a specific title, actor or director.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Title, actor or director, in any language." },
        type: { type: "string", enum: ["movie", "tv", "all"], description: "Default all." },
      },
      required: ["query"],
    },
  },
  {
    name: "discover_titles",
    description:
      "Filter the catalog. The main tool for requests like 'a scary Korean movie from the 2010s under 2 hours'. All filters are optional and combine.",
    parameters: {
      type: "object",
      properties: {
        type: { ...typeEnum, description: "movie or tv." },
        genre_ids: { type: "array", items: { type: "integer" }, description: "TMDB genre ids; a title must have all of them." },
        exclude_genre_ids: { type: "array", items: { type: "integer" } },
        year_from: { type: "integer" },
        year_to: { type: "integer" },
        min_rating: { type: "number", description: "Minimum average rating, 0 to 10." },
        min_runtime: { type: "integer", description: "Minimum minutes (episode length for TV)." },
        max_runtime: { type: "integer", description: "Maximum minutes (episode length for TV)." },
        origin_country: { type: "string", description: "ISO 3166-1 code such as KR, JP, ID, US." },
        original_language: { type: "string", description: "ISO 639-1 code such as ko, ja, id, en." },
        keyword_ids: { type: "array", items: { type: "integer" }, description: "Ids from find_keyword; any of them may match." },
        audience: { type: "string", enum: ["all", "kids", "teen", "adult"], description: "Default all." },
        sort: { type: "string", enum: ["popular", "top_rated", "newest"], description: "Default popular." },
      },
      required: ["type"],
    },
  },
  {
    name: "find_keyword",
    description:
      "Turn a theme or mood into TMDB keyword ids (for example 'time travel', 'heist', 'based on a true story'), then pass them to discover_titles.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "A theme in English works best." } },
      required: ["query"],
    },
  },
  {
    name: "get_title_details",
    description:
      "Details for one title: synopsis, genres, runtime, rating, age rating, director, main cast, seasons and where to stream, rent or buy it in the visitor's region.",
    parameters: {
      type: "object",
      properties: { type: typeEnum, id: { type: "integer" } },
      required: ["type", "id"],
    },
  },
  {
    name: "get_recommendations",
    description: "Titles that people who liked a given title also liked.",
    parameters: {
      type: "object",
      properties: { type: typeEnum, id: { type: "integer" } },
      required: ["type", "id"],
    },
  },
  {
    name: FINAL_TOOL,
    description:
      "Give the visitor your final answer. Call it once, after you have results, with 3 to 6 picks taken only from titles returned by the other tools. With no suitable title, or an off-topic request, send an empty picks list and explain in the message.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "A short, friendly answer in the visitor's language. No lists of titles here." },
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: typeEnum,
              id: { type: "integer" },
              reason: { type: "string", description: "Why it fits this request, under 20 words." },
            },
            required: ["type", "id", "reason"],
          },
        },
        filters_used: {
          type: "array",
          items: { type: "string" },
          description: "Short labels for the criteria you applied, such as 'Horror', 'Korea', '2010–2019', 'under 120 min'.",
        },
      },
      required: ["message", "picks"],
    },
  },
];

export const STATUS_FOR_TOOL: Record<string, AiStatusKey> = {
  search_titles: "search",
  discover_titles: "discover",
  find_keyword: "keyword",
  get_title_details: "details",
  get_recommendations: "recommend",
};

/** Titles the tools have returned in this conversation turn: the only ones that may appear as picks. */
export type SeenTitles = Map<string, MediaSummary>;

export const seenKey = (type: MediaType, id: number) => `${type}-${id}`;

function brief(item: MediaSummary, seen: SeenTitles) {
  seen.set(seenKey(item.mediaType, item.id), item);
  return {
    type: item.mediaType,
    id: item.id,
    title: item.title,
    year: item.date?.slice(0, 4) ?? null,
    rating: Math.round(item.voteAverage * 10) / 10,
    votes: item.voteCount,
    genres: item.genreIds.map((g) => GENRE_NAMES[g]).filter(Boolean).slice(0, 3),
    overview: item.overview.length > 160 ? `${item.overview.slice(0, 157)}...` : item.overview,
  };
}

const asType = (v: unknown): MediaType | null => (v === "movie" || v === "tv" ? v : null);
const asInt = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);
const asIntList = (v: unknown): number[] | undefined =>
  Array.isArray(v) ? v.map(asInt).filter((n): n is number => n !== undefined).slice(0, 6) : undefined;
const asString = (v: unknown, max = 80): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

/** Runs one read-only tool. Whatever goes wrong is returned as `{ error }` so the model can adapt. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  seen: SeenTitles,
  locale: Locale,
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case "search_titles": {
        const query = asString(args.query);
        if (!query) return { error: "query is required" };
        const type = args.type === "movie" || args.type === "tv" ? args.type : "all";
        const found = await search(query, type, 1, locale);
        return { results: found.results.slice(0, 8).map((r) => brief(r, seen)) };
      }
      case "discover_titles": {
        const type = asType(args.type);
        if (!type) return { error: "type must be movie or tv" };
        const f: AdvancedDiscover = {
          type,
          genreIds: asIntList(args.genre_ids),
          excludeGenreIds: asIntList(args.exclude_genre_ids),
          yearFrom: asInt(args.year_from),
          yearTo: asInt(args.year_to),
          minRating: typeof args.min_rating === "number" ? Math.min(Math.max(args.min_rating, 0), 10) : undefined,
          minRuntime: asInt(args.min_runtime),
          maxRuntime: asInt(args.max_runtime),
          originCountry: asString(args.origin_country, 2),
          originalLanguage: asString(args.original_language, 3),
          keywordIds: asIntList(args.keyword_ids),
          audience: (["all", "kids", "teen", "adult"] as const).includes(args.audience as AudienceFilter)
            ? (args.audience as AudienceFilter)
            : undefined,
          sort: (["popular", "top_rated", "newest"] as const).includes(args.sort as SortKey)
            ? (args.sort as SortKey)
            : undefined,
        };
        const results = await discoverAdvanced(f, locale);
        return results.length > 0
          ? { results: results.slice(0, 10).map((r) => brief(r, seen)) }
          : { results: [], note: "Nothing matched. Relax one filter (a year range, runtime or rating) and try again." };
      }
      case "find_keyword": {
        const query = asString(args.query);
        if (!query) return { error: "query is required" };
        return { keywords: await searchKeywords(query, locale) };
      }
      case "get_title_details": {
        const type = asType(args.type);
        const id = asInt(args.id);
        if (!type || id === undefined) return { error: "type and id are required" };
        const d = await getDetail(type, id, locale);
        seen.set(seenKey(type, id), d);
        const names = (list: Array<{ name: string }> | undefined) => (list ?? []).map((p) => p.name).slice(0, 6);
        return {
          type,
          id,
          title: d.title,
          year: d.date?.slice(0, 4) ?? null,
          tagline: d.tagline || undefined,
          overview: d.overview.length > 500 ? `${d.overview.slice(0, 497)}...` : d.overview,
          genres: d.genres.map((g) => g.name),
          runtime_minutes: d.runtime,
          rating: Math.round(d.voteAverage * 10) / 10,
          votes: d.voteCount,
          age_rating: d.certification,
          directors: d.directors.slice(0, 3),
          creators: d.creators.slice(0, 3),
          cast: d.cast.slice(0, 6).map((c) => c.name),
          seasons: d.numberOfSeasons,
          episodes: d.numberOfEpisodes,
          status: d.status,
          where_to_watch: d.providers
            ? { stream: names(d.providers.stream), rent: names(d.providers.rent), buy: names(d.providers.buy) }
            : null,
        };
      }
      case "get_recommendations": {
        const type = asType(args.type);
        const id = asInt(args.id);
        if (!type || id === undefined) return { error: "type and id are required" };
        const items = await getRecommendations(type, id, locale);
        return { results: items.map((r) => brief(r, seen)) };
      }
      default:
        return { error: `unknown tool ${name}` };
    }
  } catch (err) {
    console.error(`[ai] tool ${name} failed:`, err);
    return { error: "The catalog could not be reached. Try again or use another approach." };
  }
}
