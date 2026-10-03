import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FilterPills } from "@/components/filter-pills";
import { MediaGrid } from "@/components/media-card";
import { Pagination } from "@/components/pagination";
import { SearchBar } from "@/components/search-bar";
import { SetupNotice } from "@/components/setup-notice";
import { parsePage, type SearchParams } from "@/lib/browse";
import { formatNumber, vars } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo";
import { TmdbConfigError, isTmdbConfigured, search } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

// Internal search results are thin, endless variations of one page: keep them out of the index
// but let crawlers follow the links to the titles.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  const { t } = await getI18n();
  const raw = (await searchParams).q;
  const q = ((Array.isArray(raw) ? raw[0] : raw) ?? "").trim().slice(0, 60);
  return buildMetadata({
    locale,
    path: "/search",
    title: q ? t("seo.searchResults", { q }) : t("searchPage.title"),
    noindex: true,
  });
}

type Kind = "all" | MediaType;
const KINDS: Array<{ value: Kind; label: Key }> = [
  { value: "all", label: "searchPage.all" },
  { value: "movie", label: "nav.movies" },
  { value: "tv", label: "nav.tv" },
];

function href(q: string, type: Kind, page = 1) {
  const p = new URLSearchParams({ q });
  if (type !== "all") p.set("type", type);
  if (page > 1) p.set("page", String(page));
  return `/search?${p.toString()}`;
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  setRequestLocale(rawLocale);
  const { t, tp, locale } = await getI18n();
  const sp = await searchParams;
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (rawQ ?? "").trim().slice(0, 100);
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const type: Kind = rawType === "movie" || rawType === "tv" ? rawType : "all";
  const page = parsePage(sp.page);

  if (!isTmdbConfigured()) return <SetupNotice />;

  let data = null;
  if (q) {
    try {
      data = await search(q, type, page);
    } catch (err) {
      if (err instanceof TmdbConfigError) return <SetupNotice />;
      throw err;
    }
  }

  return (
    <Container className="pt-8 md:pt-12">
      <h1 className="t-headline anim-rise">{t("searchPage.title")}</h1>
      <div className="anim-rise mt-6 max-w-[640px]" style={vars({ "--d": "100ms" })}>
        <SearchBar initial={q} placeholder={t("search.placeholder")} />
      </div>

      {!q && (
        <div className="mt-10">
          <EmptyState photo="projector" title={t("searchPage.promptTitle")}>
            {t("searchPage.promptBody")}
          </EmptyState>
        </div>
      )}

      {q && data && (
        <div className="mt-8">
          <FilterPills
            label={t("searchPage.show")}
            options={KINDS.map((k) => ({
              label: t(k.label),
              href: href(q, k.value),
              active: type === k.value,
            }))}
          />
          <p className="t-body mt-5 text-muted" aria-live="polite">
            {tp("searchPage.results", data.totalResults, { n: formatNumber(data.totalResults, locale), q })}
          </p>

          {data.results.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                photo="projector"
                title={t("searchPage.noneTitle")}
                action={{ label: t("searchPage.noneAction"), href: "/movies" }}
              >
                {t("searchPage.noneBody")}
              </EmptyState>
            </div>
          ) : (
            <div className="mt-6">
              <MediaGrid items={data.results} />
            </div>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href(q, type, p)} />
        </div>
      )}
    </Container>
  );
}
