"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/locale-link";
import { cn } from "@/lib/format";
import { useI18n } from "./i18n-provider";

/**
 * Counts page changes inside this tab (module state survives client navigations, resets on a full load).
 * More than one means there is an in-app page to go back to; one means the visitor landed here directly
 * (search engine, shared link, reload), so "Back" goes to the list instead of leaving the site.
 */
let pageViews = 0;
let lastPath: string | null = null;

export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // Compare with the last path: Strict Mode runs effects twice in development and must not count as a navigation.
    if (lastPath === pathname) return;
    lastPath = pathname;
    pageViews += 1;
  }, [pathname]);
  return null;
}

export function BackButton({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Link
      href={fallbackHref}
      onClick={(e) => {
        const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
        if (modified || pageViews < 2) return; // normal link: goes to the list
        e.preventDefault();
        router.back();
      }}
      className={cn(
        "t-body group inline-flex min-h-9 items-center gap-2 rounded-full py-1.5 pl-3 pr-4 pointer-coarse:min-h-11",
        "transition-[transform,background-color] duration-300 ease-out-expo active:scale-95",
        className,
      )}
    >
      <ArrowLeft
        aria-hidden
        className="size-4 transition-transform duration-300 ease-spring group-hover:-translate-x-0.5"
        strokeWidth={1.75}
      />
      {t("nav.back")}
    </Link>
  );
}
