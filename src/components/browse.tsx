import { browseHref, parseBrowse, type SearchParams } from "@/lib/browse";
import { browseBase, genreById, genrePath, type GenrePage } from "@/lib/genres";
import { itemListJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { vars } from "@/lib/format";
import {
  TmdbConfigError,
  discover,
  getGenres,
  isTmdbConfigured,
} from "@/lib/tmdb";
import type { Key } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import type { AudienceFilter, Genre, MediaSummary, MediaType, Paged, SortKey } from "@/lib/types";
import { Breadcrumbs } from "./breadcrumbs";
import { Container } from "./container";
import { JsonLd } from "./json-ld";
import { EmptyState } from "./empty-state";
import { X } from "lucide-react";
import Link from "@/components/locale-link";
import { FilterBar, PillGroup, SortMenu, type FilterOption } from "./browse-filters";
import { MediaGrid } from "./media-card";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";
import { SetupNotice } from "./setup-notice";

const SORTS: Array<{ value: SortKey; label: Key }> = [
  { value: "popular", label: "sort.popular" },
  { value: "top_rated", label: "sort.top_rated" },
  { value: "newest", label: "sort.newest" },
];

const AUDIENCES: Record<MediaType, Array<{ value: AudienceFilter; label: Key }>> = {
  movie: [
    { value: "all", label: "age.all" },
    { value: "kids", label: "age.kidsMovie" },
    { value: "teen", label: "age.teen" },
    { value: "adult", label: "age.adult" },
  ],
  tv: [
    { value: "all", label: "age.all" },
    { value: "kids", label: "age.kidsTv" },
  ],
};

/** TMDB genres without a landing page, so their labels still come from our own dictionaries (TMDB repeats names in some languages). */
const EXTRA_GENRE_LABELS: Record<number, Key> = {
  36: "genre.history",
  10402: "genre.music",
  10770: "genre.tvMovie",
  10752: "genre.war",
  37: "genre.western",
};

/** The genres most people look for come first; the rest follow alphabetically behind "Show more". */
const GENRE_PRIORITY: Record<MediaType, number[]> = {
  movie: [28, 35, 18, 27, 878, 10749, 16, 53, 12, 10751, 80, 14, 9648, 99],
  tv: [10759, 35, 18, 10765, 16, 80, 10751, 9648, 99, 10764],
};
const VISIBLE_GENRES = 8;

export async function Browse({
  type,
  searchParams,
  genrePage,
}: {
  type: MediaType;
  searchParams: SearchParams;
  /** Set on /movies/genre/[slug] and /tv/genre/[slug]: the genre comes from the path, not the query. */
  genrePage?: GenrePage;
}) {
  if (!isTmdbConfigured()) return <SetupNotice />;

  const { t, locale } = await getI18n();
  const parsed = parseBrowse(searchParams, type);
  const state = genrePage ? { ...parsed, genre: genrePage.id } : parsed;
  const base = browseBase(type);
  // Sort, age and paging links stay on the page you are on; the genre then lives in the path.
  const linkBase = genrePage ? genrePath(type, genrePage.slug) : base;
  const linkState = genrePage ? { ...state, genre: undefined } : state;
  const sectionTitle = type === "movie" ? t("nav.movies") : t("nav.tv");
  const title = genrePage
    ? t(type === "movie" ? "genrePage.movieTitle" : "genrePage.tvTitle", { genre: t(genrePage.label) })
    : sectionTitle;
  const kidsTv = type === "tv" && state.audience === "kids";
  const filtersDefault = state.sort === "popular" && state.audience === "all";

  // A genre alone links to its landing page when it has one; combined with other filters it stays a query.
  const genreLink = (id: number | undefined): string => {
    if (id === undefined) return browseHref(base, { ...state, genre: undefined });
    const landing = genreById(type, id);
    return landing && filtersDefault ? genrePath(type, landing.slug) : browseHref(base, state, { genre: id });
  };

  let genres: Genre[] = [];
  let data: Paged<MediaSummary>;
  try {
    [genres, data] = await Promise.all([
      kidsTv ? Promise.resolve([] as Genre[]) : getGenres(type),
      discover(type, state),
    ]);
  } catch (err) {
    if (err instanceof TmdbConfigError) return <SetupNotice />;
    throw err;
  }

  const genreLabel = (g: Genre): string => {
    const key = genreById(type, g.id)?.label ?? EXTRA_GENRE_LABELS[g.id];
    return key ? t(key) : g.name;
  };
  const priority = GENRE_PRIORITY[type];
  const rank = (id: number) => {
    const i = priority.indexOf(id);
    return i === -1 ? priority.length : i;
  };
  const orderedGenres = [...genres].sort(
    (a, b) => rank(a.id) - rank(b.id) || genreLabel(a).localeCompare(genreLabel(b), locale),
  );

  const sortOptions: FilterOption[] = SORTS.map((x) => ({
    label: t(x.label),
    href: browseHref(linkBase, linkState, { sort: x.value }),
    active: state.sort === x.value,
  }));
  const currentSort = sortOptions.find((o) => o.active)?.label ?? sortOptions[0].label;
  const audienceOptions: FilterOption[] = AUDIENCES[type].map((a) => ({
    label: t(a.label),
    href: browseHref(linkBase, linkState, { audience: a.value }),
    active: state.audience === a.value,
  }));

  // Active audience and genre, each removable on its own (sort has its own menu).
  const chips: Array<{ label: string; href: string }> = [];
  const audienceChip = audienceOptions.find((o) => o.active && state.audience !== "all");
  if (audienceChip) chips.push({ label: audienceChip.label, href: browseHref(linkBase, linkState, { audience: "all" }) });
  const activeGenre = state.genre ? genres.find((g) => g.id === state.genre) : undefined;
  const genreName = activeGenre ? genreLabel(activeGenre) : genrePage ? t(genrePage.label) : undefined;
  if (state.genre && genreName) chips.push({ label: genreName, href: genreLink(undefined) });
  const clearHref = browseHref(base, state, { genre: undefined, audience: "all" });

  return (
    <Container className="pt-8 md:pt-12">
      <JsonLd
        data={[
          itemListJsonLd(locale, title, data.results),
          ...(genrePage
            ? [
                breadcrumbJsonLd(locale, [
                  { name: t("nav.home"), path: "/" },
                  { name: sectionTitle, path: base },
                  { name: t(genrePage.label), path: genrePath(type, genrePage.slug) },
                ]),
              ]
            : []),
        ]}
      />
      {genrePage && (
        <Breadcrumbs
          items={[
            { name: t("nav.home"), href: "/" },
            { name: sectionTitle, href: base },
            { name: t(genrePage.label) },
          ]}
        />
      )}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h1 className="t-headline anim-rise text-balance">{title}</h1>
        <div className="anim-rise w-full md:max-w-[420px]" style={vars({ "--d": "120ms" })}>
          <SearchBar placeholder={type === "movie" ? t("search.inMovies") : t("search.inTv")} />
        </div>
      </div>

      <FilterBar
        count={chips.length}
        chips={
          <>
            {chips.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                aria-label={t("browse.removeFilter", { name: c.label })}
                className="t-body inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink py-1.5 pl-4 pr-3 text-on-ink transition-[transform,opacity] duration-300 ease-out-expo hover:opacity-85 active:scale-95 pointer-coarse:min-h-11"
              >
                {c.label}
                <X aria-hidden className="size-3.5" strokeWidth={2} />
              </Link>
            ))}
            {chips.length > 1 && (
              <Link
                href={clearHref}
                className="t-body inline-flex min-h-9 items-center px-2 text-muted underline-offset-4 hover:text-ink hover:underline pointer-coarse:min-h-11"
              >
                {t("browse.clearAll")}
              </Link>
            )}
          </>
        }
        sort={<SortMenu label={t("browse.sortBy")} current={currentSort} options={sortOptions} />}
        panel={
          <>
            <PillGroup label={t("browse.age")} options={audienceOptions} />
            {type === "tv" && <p className="t-meta -mt-2 max-w-[70ch] text-muted">{t("browse.tvNote")}</p>}
            {!kidsTv && genres.length > 0 && (
              <PillGroup
                label={t("browse.genre")}
                limit={VISIBLE_GENRES}
                options={[
                  { label: t("browse.allGenres"), href: genreLink(undefined), active: !state.genre },
                  ...orderedGenres.map((g) => ({
                    label: genreLabel(g),
                    href: genreLink(g.id),
                    active: state.genre === g.id,
                  })),
                ]}
              />
            )}
          </>
        }
      />

      <div className="mt-8">
        {data.results.length === 0 ? (
          <EmptyState
            photo="projector"
            title={t("browse.emptyTitle")}
            action={{ label: t("browse.emptyAction"), href: linkBase }}
          >
            {t("browse.emptyBody")}
          </EmptyState>
        ) : (
          <MediaGrid items={data.results} />
        )}
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          hrefFor={(p) => browseHref(linkBase, linkState, { page: p })}
        />
      </div>
    </Container>
  );
}
