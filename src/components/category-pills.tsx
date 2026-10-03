import Link from "@/components/locale-link";
import {
  Baby,
  Clapperboard,
  Drama,
  Ghost,
  Laugh,
  Palette,
  Rocket,
  Swords,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { vars } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

const PILLS: Array<{ label: Key; href: string; icon: LucideIcon }> = [
  { label: "nav.movies", href: "/movies", icon: Clapperboard },
  { label: "nav.tv", href: "/tv", icon: Tv },
  { label: "pills.kids", href: "/movies?audience=kids", icon: Baby },
  { label: "pills.action", href: "/movies/genre/action", icon: Swords },
  { label: "pills.comedy", href: "/movies/genre/comedy", icon: Laugh },
  { label: "pills.horror", href: "/movies/genre/horror", icon: Ghost },
  { label: "pills.scifi", href: "/movies/genre/sci-fi", icon: Rocket },
  { label: "pills.drama", href: "/movies/genre/drama", icon: Drama },
  { label: "pills.animation", href: "/movies/genre/animation", icon: Palette },
];

export async function CategoryPills() {
  const { t } = await getI18n();
  return (
    <nav aria-label={t("pills.aria")}>
      <ul className="stagger flex flex-wrap justify-center gap-2" style={vars({ "--stagger-base": "950ms" })}>
        {PILLS.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group t-lead inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-surface py-1.5 pl-1.5 pr-4 shadow-pill transition-[transform,background-color,color,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-1 hover:border-ink hover:bg-ink hover:text-on-ink hover:shadow-float active:translate-y-0"
            >
              <span className="grid size-6 place-items-center rounded-full bg-canvas text-ink transition-[transform,background-color] duration-300 ease-spring group-hover:rotate-[14deg] group-hover:scale-110 group-hover:bg-surface">
                <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="t-swap">{t(label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
