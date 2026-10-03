"use client";

import { Star } from "lucide-react";
import { cn, formatScore } from "@/lib/format";
import { useI18n } from "./i18n-provider";

/** Read-only 5-star row. `value` is TMDB's 0-10 score. */
export function Stars({
  value,
  size = 11,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const filled = Math.round(value / 2);
  return (
    <span
      role="img"
      aria-label={t("stars.aria", { value: formatScore(value, locale) })}
      className={cn("inline-flex items-center gap-px", className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          width={size}
          height={size}
          strokeWidth={1.75}
          className={i < filled ? "fill-current" : "fill-none opacity-40"}
        />
      ))}
    </span>
  );
}
