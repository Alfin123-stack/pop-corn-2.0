"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn, vars } from "@/lib/format";
import { useI18n } from "./i18n-provider";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  max = 10,
  size = 22,
  readOnly = false,
  className,
}: StarRatingProps) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const [pop, setPop] = useState({ n: 0, id: 0 });
  const shown = hover || value;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="radiogroup"
        aria-label={t("rate.group")}
        className="flex items-center gap-0.5 pointer-coarse:grid pointer-coarse:grid-cols-5 pointer-coarse:gap-0"
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          const lit = n <= shown;
          return (
            <button
              // Changing the key restarts the pop animation on the star that was just picked.
              key={`${n}-${pop.n === n ? pop.id : 0}`}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={t("rate.star", { n, max })}
              disabled={readOnly}
              onClick={() => {
                setPop({ n, id: Date.now() });
                onChange?.(n);
              }}
              onMouseEnter={() => !readOnly && setHover(n)}
              onFocus={() => !readOnly && setHover(n)}
              onBlur={() => setHover(0)}
              className={cn(
                "grid place-items-center rounded-full p-0.5 pointer-coarse:p-3",
                readOnly ? "cursor-default" : "cursor-pointer",
                pop.n === n && "anim-pop",
                !readOnly && "hover:-translate-y-0.5 hover:scale-125",
              )}
            >
              <Star
                aria-hidden
                width={size}
                height={size}
                strokeWidth={1.75}
                style={vars({ transitionDelay: `${i * 14}ms` })}
                className={cn(
                  "transition-[fill,color] duration-200",
                  lit ? "fill-ink text-ink" : "fill-transparent text-stone",
                )}
              />
            </button>
          );
        })}
      </div>
      <span className="t-strong min-w-10 tabular-nums text-ink">
        {shown > 0 ? `${shown}/${max}` : ""}
      </span>
    </div>
  );
}
