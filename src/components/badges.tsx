"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import type { Audience, MediaType } from "@/lib/types";
import { useI18n } from "./i18n-provider";

/** Neutral pill. Never colored: violet stays reserved for the search button and wordmark. */
export function Pill({
  children,
  className,
  tone = "canvas",
}: {
  children: ReactNode;
  className?: string;
  tone?: "canvas" | "outline" | "white";
}) {
  return (
    <span
      className={cn(
        "t-meta inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        tone === "canvas" && "bg-canvas text-ink",
        tone === "outline" && "border border-hairline bg-surface text-ink shadow-pill",
        tone === "white" && "bg-surface text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TypePill({ type }: { type: MediaType }) {
  const { t } = useI18n();
  return (
    <span className="t-caption rounded-full bg-canvas px-2 py-0.5 text-ink">
      {type === "movie" ? t("media.movie") : t("media.tvShort")}
    </span>
  );
}

export function CertBadges({
  certification,
  audience,
  tone = "outline",
}: {
  certification: string | null;
  audience: Audience;
  tone?: "outline" | "white";
}) {
  const { t } = useI18n();
  if (!certification) return <Pill tone={tone}>{t("aud.unrated")}</Pill>;
  return (
    <>
      <Pill tone={tone}>{certification}</Pill>
      {audience !== "unrated" && <Pill tone={tone}>{t(`aud.${audience}`)}</Pill>}
    </>
  );
}
