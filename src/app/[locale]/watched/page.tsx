import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchedView } from "@/components/watched-view";
import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

// Private, client-side data (localStorage): nothing here for a search engine to index.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  const { t } = await getI18n();
  return buildMetadata({ locale, path: "/watched", title: t("nav.list"), noindex: true });
}

export default async function WatchedPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <WatchedView />;
}
