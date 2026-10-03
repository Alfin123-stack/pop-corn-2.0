import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DetailView } from "@/components/detail-view";
import { JsonLd } from "@/components/json-ld";
import { SetupNotice } from "@/components/setup-notice";
import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { breadcrumbJsonLd, titleJsonLd } from "@/lib/jsonld";
import { detailMetadata, loadDetail } from "@/lib/load-detail";

type Props = { params: Promise<{ locale: string; id: string }> };

// Detail pages are generated on first visit, then refreshed every six hours.
export const revalidate = 21600;
// Titles are not known at build time: render any id on its first visit, then cache it.
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  return detailMetadata("tv", id, locale);
}

export default async function TitlePage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();
  setRequestLocale(rawLocale);
  const result = await loadDetail("tv", id);
  if (result.status === "setup") return <SetupNotice />;
  const { t, locale } = await getI18n();
  const detail = result.detail;
  const section = detail.mediaType === "movie" ? { name: t("nav.movies"), path: "/movies" } : { name: t("nav.tv"), path: "/tv" };
  return (
    <>
      <JsonLd
        data={[
          titleJsonLd(locale, detail),
          breadcrumbJsonLd(locale, [
            { name: t("nav.home"), path: "/" },
            section,
            { name: detail.title, path: `/${detail.mediaType}/${detail.id}` },
          ]),
        ]}
      />
      <DetailView
        detail={detail}
        breadcrumbs={
          <Breadcrumbs items={[{ name: t("nav.home"), href: "/" }, { name: section.name, href: section.path }, { name: detail.title }]} />
        }
      />
    </>
  );
}