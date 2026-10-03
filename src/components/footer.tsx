import Link from "@/components/locale-link";
import type { Key } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { Reveal } from "./reveal";

const GROUPS: Array<{ title: Key; links: Array<{ label: Key; href: string }> }> = [
  {
    title: "footer.browse",
    links: [
      { label: "nav.movies", href: "/movies" },
      { label: "nav.tv", href: "/tv" },
      { label: "footer.kidsMovies", href: "/movies?audience=kids" },
      { label: "footer.kidsTv", href: "/tv?audience=kids" },
    ],
  },
  {
    title: "footer.discover",
    links: [
      { label: "footer.topMovies", href: "/movies?sort=top_rated" },
      { label: "footer.topTv", href: "/tv?sort=top_rated" },
      { label: "footer.newestMovies", href: "/movies?sort=newest" },
      { label: "nav.search", href: "/search" },
    ],
  },
  {
    title: "footer.library",
    links: [{ label: "nav.list", href: "/watched" }],
  },
];

export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-20 bg-footer pb-[env(safe-area-inset-bottom,0px)] text-on-footer md:mt-24">
      <div className="mx-auto grid max-w-[75rem] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <Reveal>
          <p className="t-display">popcorn</p>
          <p className="t-body t-swap mt-3 max-w-[34ch] text-fog">{t("footer.tagline")}</p>
        </Reveal>
        {GROUPS.map((g, i) => (
          <Reveal as="div" key={g.title} delay={(i + 1) * 90}>
            <nav aria-label={t(g.title)}>
              <h2 className="t-meta t-swap text-fog">{t(g.title)}</h2>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="t-body t-swap inline-flex min-h-8 items-center rounded-full text-on-footer pointer-coarse:min-h-11 transition-[transform,color] duration-300 ease-out-expo hover:translate-x-1.5 hover:text-fog"
                    >
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>
        ))}
      </div>
      <div className="border-t border-on-footer/10">
        <p className="t-meta t-swap mx-auto max-w-[75rem] px-4 py-5 text-fog sm:px-6">
          {t("footer.credit")}
        </p>
      </div>
    </footer>
  );
}
