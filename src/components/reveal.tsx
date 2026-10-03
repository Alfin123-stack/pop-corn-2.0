"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn, vars } from "@/lib/format";

interface RevealProps {
  children: ReactNode;
  /** Milliseconds to wait once the element enters the viewport. */
  delay?: number;
  /** Distance in px the element travels while appearing. */
  y?: number;
  as?: "div" | "li" | "section" | "ul";
  className?: string;
}

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, y = 18, as = "div", className }: RevealProps) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", shown && "is-in", className)}
      style={vars({ "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px` })}
    >
      {children}
    </Tag>
  );
}
