import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "./i18n/config";
import { getI18n } from "./i18n/server";
import { buildMetadata, clampDescription } from "./seo";
import { TmdbConfigError, TmdbError, getDetail } from "./tmdb";
import type { MediaDetail, MediaType } from "./types";

export type DetailResult = { status: "ok"; detail: MediaDetail } | { status: "setup" };

/** Shared by the movie and TV pages. Missing key -> setup screen, unknown id -> 404. */
export async function loadDetail(type: MediaType, rawId: string): Promise<DetailResult> {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  try {
    return { status: "ok", detail: await getDetail(type, id) };
  } catch (err) {
    if (err instanceof TmdbConfigError) return { status: "setup" };
    if (err instanceof TmdbError && err.status === 404) notFound();
    throw err;
  }
}

export async function detailMetadata(type: MediaType, rawId: string, locale: Locale): Promise<Metadata> {
  const { t } = await getI18n();
  const kind = type === "movie" ? "movie" : "tv";
  const path = `/${kind}/${rawId}`;
  const fallback = buildMetadata({
    locale,
    path,
    title: type === "movie" ? t("media.movie") : t("media.tv"),
    noindex: true,
  });
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return fallback;
  try {
    const d = await getDetail(type, id);
    const year = d.date?.slice(0, 4);
    return buildMetadata({
      locale,
      path: `/${kind}/${d.id}`,
      title: year ? `${d.title} (${year})` : d.title,
      description: clampDescription(d.overview) ?? t("seo.detailFallback", { title: d.title }),
      type: type === "movie" ? "video.movie" : "video.tv_show",
    });
  } catch {
    return fallback;
  }
}
