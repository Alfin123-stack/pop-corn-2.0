import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { TmdbConfigError, TmdbError, search } from "@/lib/tmdb";
import type { Suggestion } from "@/lib/types";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  // The client sends ?lang= so each language has its own cache entry.
  const lang = params.get("lang");
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  if (q.length < 2) return NextResponse.json({ results: [] satisfies Suggestion[] });

  try {
    const data = await search(q, "all", 1, locale);
    const results: Suggestion[] = data.results.slice(0, 6).map((r) => ({
      id: r.id,
      mediaType: r.mediaType,
      title: r.title,
      year: r.date ? r.date.slice(0, 4) : null,
      posterPath: r.posterPath,
      voteAverage: r.voteAverage,
    }));
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return NextResponse.json({ error: "TMDB_API_KEY is not configured" }, { status: 503 });
    }
    if (err instanceof TmdbError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
