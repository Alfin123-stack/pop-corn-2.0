"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "@/components/locale-link";
import { cn } from "@/lib/format";
import { useI18n } from "./i18n-provider";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
}

/**
 * The browse controls on one calm row: a Filters button (with a count), the active filters as removable
 * chips, and the sort menu on the right. Age and genre sit in a panel that opens under the row.
 *
 * Everything inside the panel is a real link that is always in the HTML (it is only hidden by CSS once
 * JavaScript is running, see `.filter-panel` in globals.css), so genre pages stay crawlable and the
 * filters still work without JavaScript.
 */
export function FilterBar({
  count,
  chips,
  sort,
  panel,
}: {
  count: number;
  chips: ReactNode;
  sort: ReactNode;
  panel: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Picking an option navigates; close the panel so the new results are in view.
  const onPanelClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "t-body inline-flex min-h-9 items-center gap-2 rounded-full border px-4 py-1.5 pointer-coarse:min-h-11",
            "transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-out-expo active:scale-95",
            open
              ? "border-ink bg-ink text-on-ink"
              : "border-hairline bg-surface shadow-pill hover:-translate-y-0.5 hover:border-ink hover:shadow-float",
          )}
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
          {t("browse.filters")}
          {count > 0 && (
            <span
              className={cn(
                "t-caption grid h-5 min-w-5 place-items-center rounded-full px-1.5 tabular-nums",
                open ? "bg-surface text-ink" : "bg-ink text-on-ink",
              )}
            >
              {count}
            </span>
          )}
        </button>
        {chips}
        <div className="ml-auto">{sort}</div>
      </div>

      <div
        id={panelId}
        data-open={open}
        onClick={onPanelClick}
        className="filter-panel mt-3 space-y-5 rounded-card bg-surface p-4 shadow-soft sm:p-5"
      >
        {panel}
      </div>
    </div>
  );
}

/** Sort as a small dropdown. A native <details>, so it works without JavaScript; the effect only adds outside-click and Escape. */
export function SortMenu({ label, current, options }: { label: string; current: string; options: FilterOption[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key === "Escape" && el?.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary
        className={cn(
          "t-body inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 py-1.5 shadow-pill pointer-coarse:min-h-11",
          "transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ink hover:shadow-float [&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="hidden text-muted sm:inline">{label}:</span>
        <span className="font-medium">{current}</span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-300 ease-spring group-open:rotate-180"
          strokeWidth={1.75}
        />
      </summary>
      <ul className="anim-menu absolute right-0 top-full z-30 mt-2 min-w-52 rounded-card bg-surface p-2 shadow-float">
        {options.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
              className={cn(
                "t-body flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors duration-200 hover:bg-canvas pointer-coarse:min-h-11",
                o.active && "font-medium",
              )}
            >
              {o.label}
              {o.active && <Check aria-hidden className="size-4" strokeWidth={2} />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * A labelled group of filter links. With `limit`, only the first `limit` options after the first one
 * ("All ...") are shown, plus the active one, and a button reveals the rest.
 */
export function PillGroup({ label, options, limit }: { label: string; options: FilterOption[]; limit?: number }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const isExtra = (o: FilterOption, i: number) => limit !== undefined && i > limit && !o.active;
  const hidden = options.filter(isExtra).length;

  return (
    <div className="pill-group" data-expanded={expanded}>
      <p className="t-meta mb-2 text-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <li key={o.href} data-extra={isExtra(o, i) ? "" : undefined}>
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              className={cn(
                "t-body inline-flex min-h-9 items-center rounded-full border px-4 py-1.5 pointer-coarse:min-h-11",
                "transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-out-expo active:scale-95",
                o.active
                  ? "border-ink bg-ink text-on-ink"
                  : "border-hairline bg-canvas hover:-translate-y-0.5 hover:border-ink",
              )}
            >
              {o.label}
            </Link>
          </li>
        ))}
        {hidden > 0 && (
          <li className="js-only">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="t-body inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-muted transition-colors duration-200 hover:text-ink pointer-coarse:min-h-11"
            >
              {expanded ? t("browse.fewerGenres") : t("browse.moreGenres", { n: hidden })}
              <ChevronDown
                aria-hidden
                className={cn("size-4 transition-transform duration-300 ease-spring", expanded && "rotate-180")}
                strokeWidth={1.75}
              />
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
