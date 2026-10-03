import type { MetadataRoute } from "next";
import { GENRE_PAGES, browseBase, genrePath } from "@/lib/genres";
import { LOCALES } from "@/lib/i18n/config";
import { localizedUrl } from "@/lib/seo";
import { getList, isTmdbConfigured } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

// Rebuilt once a day. TMDB has millions of titles, so only the most popular and best rated are listed;
// every other detail page is still reachable through links and gets indexed as it is discovered.
export const revalidate = 86400;

const PAGES_PER_LIST = 5; // 20 titles per page

type Frequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** One entry per language version, each listing all versions as alternates (hreflang in the sitemap). */
function entries(path: string, changeFrequency: Frequency, priority: number): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(l, path)]));
  return LOCALES.map((l) => ({
    url: localizedUrl(l, path),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

async function topTitleIds(type: MediaType): Promise<number[]> {
  const requests = (["popular", "top_rated"] as const).flatMap((list) =>
    Array.from({ length: PAGES_PER_LIST }, (_, i) => getList(type, list, i + 1)),
  );
  const settled = await Promise.allSettled(requests);
  const ids = new Set<number>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.results) ids.add(item.id);
  }
  return [...ids];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    ...entries("/", "daily", 1),
    ...entries(browseBase("movie"), "daily", 0.9),
    ...entries(browseBase("tv"), "daily", 0.9),
    ...GENRE_PAGES.movie.flatMap((g) => entries(genrePath("movie", g.slug), "daily", 0.7)),
    ...GENRE_PAGES.tv.flatMap((g) => entries(genrePath("tv", g.slug), "daily", 0.7)),
  ];

  if (!isTmdbConfigured()) return urls;

  const [movies, shows] = await Promise.all([topTitleIds("movie"), topTitleIds("tv")]);
  for (const id of movies) urls.push(...entries(`/movie/${id}`, "weekly", 0.6));
  for (const id of shows) urls.push(...entries(`/tv/${id}`, "weekly", 0.6));
  return urls;
}
