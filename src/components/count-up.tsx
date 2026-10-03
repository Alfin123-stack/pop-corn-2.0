"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { useI18n } from "./i18n-provider";

/** Counts from the previous value to the new one. */
export function CountUp({
  value,
  decimals = 0,
  duration = 900,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const { locale } = useI18n();
  const [shown, setShown] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      previous.current = value;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else previous.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{formatNumber(shown, locale, decimals)}</span>;
}
