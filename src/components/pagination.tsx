import Link from "@/components/locale-link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { Reveal } from "./reveal";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

const base =
  "t-strong group inline-flex min-h-11 items-center gap-1 rounded-full border border-hairline bg-surface px-4 py-2 shadow-pill";
const live =
  "transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-float active:translate-y-0";

export async function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const { t } = await getI18n();
  return (
    <Reveal>
      <nav aria-label={t("pager.aria")} className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={cn(base, live)} rel="prev">
            <ChevronLeft
              aria-hidden
              className="size-4 transition-transform duration-300 ease-spring group-hover:-translate-x-1"
            />
            {t("pager.prev")}
          </Link>
        ) : (
          <span aria-disabled className={cn(base, "opacity-40")}>
            <ChevronLeft aria-hidden className="size-4" />
            {t("pager.prev")}
          </span>
        )}
        <span className="t-body text-muted">
          {t("pager.of", { page, total: totalPages })}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={cn(base, live)} rel="next">
            {t("pager.next")}
            <ChevronRight
              aria-hidden
              className="size-4 transition-transform duration-300 ease-spring group-hover:translate-x-1"
            />
          </Link>
        ) : (
          <span aria-disabled className={cn(base, "opacity-40")}>
            {t("pager.next")}
            <ChevronRight aria-hidden className="size-4" />
          </span>
        )}
      </nav>
    </Reveal>
  );
}
