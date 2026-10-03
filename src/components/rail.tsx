"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "./i18n-provider";

const arrow =
  "anim-pop absolute top-[38%] z-10 tap-target grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface shadow-float transition-[scale,box-shadow] duration-300 ease-spring hover:scale-125 hover:shadow-soft";

export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        role="group"
        aria-label={label}
        onScroll={update}
        className="no-scrollbar -my-3 flex snap-x gap-3 overflow-x-auto py-3"
      >
        {children}
      </div>
      {canPrev && (
        <button type="button" aria-label={t("rail.left", { label })} onClick={() => scroll(-1)} className={`${arrow} left-2`}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
      )}
      {canNext && (
        <button type="button" aria-label={t("rail.right", { label })} onClick={() => scroll(1)} className={`${arrow} right-2`}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
