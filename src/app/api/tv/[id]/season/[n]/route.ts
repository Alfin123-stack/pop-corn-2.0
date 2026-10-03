import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { TmdbConfigError, TmdbError, getSeason } from "@/lib/tmdb";

type Ctx = { params: Promise<{ id: string; n: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id, n } = await params;
  const lang = new URL(req.url).searchParams.get("lang");
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const tvId = Number(id);
  const season = Number(n);

  if (!Number.isInteger(tvId) || tvId <= 0 || !Number.isInteger(season) || season < 0) {
    return NextResponse.json({ error: "Invalid id or season" }, { status: 400 });
  }

  try {
    const episodes = await getSeason(tvId, season, locale);
    return NextResponse.json(
      { episodes },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return NextResponse.json({ error: "TMDB_API_KEY is not configured" }, { status: 503 });
    }
    if (err instanceof TmdbError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 502 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
