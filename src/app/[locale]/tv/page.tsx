import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Browse } from "@/components/browse";
import { browseMetadata } from "@/lib/browse-metadata";
import type { SearchParams } from "@/lib/browse";
import { isLocale } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/server";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  return browseMetadata({ type: "tv", locale, searchParams: await searchParams });
}

export default async function TvIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <Browse type="tv" searchParams={await searchParams} />;
}
