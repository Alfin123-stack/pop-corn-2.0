import { ChevronRight } from "lucide-react";
import Link from "@/components/locale-link";
import { getI18n } from "@/lib/i18n/server";

/** Visible breadcrumb trail. The last item is the current page and is not a link. */
export async function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  const { t } = await getI18n();
  return (
    <nav aria-label={t("crumb.aria")} className="mb-4 md:mb-5">
      <ol className="t-meta flex flex-wrap items-center gap-x-1 gap-y-0.5 text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="inline-flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-6 items-center rounded px-0.5 hover:text-ink pointer-coarse:min-h-11"
                >
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="line-clamp-1 break-words px-0.5 text-ink">
                  {item.name}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
