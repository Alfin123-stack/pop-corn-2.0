import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Browse } from "@/components/browse";
import { genreBrowseMetadata } from "@/lib/browse-metadata";
import type { SearchParams } from "@/lib/browse";
import { GENRE_PAGES, genreBySlug } from "@/lib/genres";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParams>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GENRE_PAGES.tv.map((g) => ({ locale, slug: g.slug })));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = genreBySlug("tv", slug);
  if (!isLocale(locale) || !genre) return {};
  setRequestLocale(locale);
  return genreBrowseMetadata({ type: "tv", locale, genre, searchParams: await searchParams });
}

export default async function TvGenrePage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const genre = genreBySlug("tv", slug);
  if (!isLocale(locale) || !genre) notFound();
  setRequestLocale(locale);
  return <Browse type="tv" searchParams={await searchParams} genrePage={genre} />;
}
