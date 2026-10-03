import { formatScore } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { tmdbImage } from "@/lib/images";
import { OG_SIZE, renderOg } from "@/lib/og";
import { getDetail } from "@/lib/tmdb";

export const alt = "popcorn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(isLocale(rawLocale) ? rawLocale : "en");
  const { t, locale } = await getI18n();
  try {
    const d = await getDetail("tv", Number(id));
    const year = d.date?.slice(0, 4);
    return renderOg({
      title: d.title,
      kicker: year ? `${t("media.tv")}, ${year}` : t("media.tv"),
      tagline: d.voteCount > 0 ? `${formatScore(d.voteAverage, locale)}/10` : undefined,
      backdropUrl: tmdbImage(d.backdropPath, "w780") ?? tmdbImage(d.posterPath, "w500"),
    });
  } catch {
    return renderOg({ title: t("footer.tagline") });
  }
}
