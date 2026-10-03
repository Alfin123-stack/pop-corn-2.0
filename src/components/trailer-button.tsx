"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { cn } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { tmdbImage } from "@/lib/images";
import type { VideoItem } from "@/lib/types";
import { useI18n } from "./i18n-provider";

const TYPE_LABEL: Record<string, Key> = {
  Trailer: "video.trailer",
  Teaser: "video.teaser",
  Clip: "video.clip",
  Featurette: "video.featurette",
  "Behind the Scenes": "video.behindTheScenes",
  Bloopers: "video.bloopers",
};

interface Props {
  youtubeKey: string;
  title: string;
  year?: string;
  backdropPath?: string | null;
  /** Trailer first, then teasers and clips. Shown as a strip under the player when there is more than one. */
  videos?: VideoItem[];
}

export function TrailerButton({ youtubeKey, title, year, backdropPath, videos = [] }: Props) {
  const { t, locale } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(youtubeKey);
  const [loaded, setLoaded] = useState(false);

  const playlist: VideoItem[] = videos.length > 0 ? videos : [{ key: youtubeKey, name: title, type: "Trailer" }];
  const active = playlist.find((v) => v.key === activeKey) ?? playlist[0];
  const typeLabel = (type: string) => (TYPE_LABEL[type] ? t(TYPE_LABEL[type]) : type);
  const backdrop = tmdbImage(backdropPath, "w780");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const play = (key: string) => {
    if (key === activeKey) return;
    setLoaded(false);
    setActiveKey(key);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveKey(youtubeKey);
          setLoaded(false);
          setOpen(true);
        }}
        className="t-strong group inline-flex min-h-11 items-center gap-2.5 rounded-full bg-violet py-2.5 pl-2.5 pr-5 text-white shadow-violet transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-violet-lg active:scale-95"
      >
        <span className="grid size-7 place-items-center rounded-full bg-white/20 transition-transform duration-300 ease-spring group-hover:scale-110">
          <Play aria-hidden className="size-3.5 fill-current" />
        </span>
        {t("trailer.watch")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="trailer-dialog m-auto max-h-dvh w-[min(calc(100vw-1.5rem),64rem)] max-w-none overflow-y-auto bg-transparent p-3 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md sm:p-4"
      >
        {open && (
          <div className="flex flex-col gap-4">
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="t-meta flex items-center gap-2 text-white/70">
                  <span className="rounded-full bg-violet px-2.5 py-0.5 text-white">{typeLabel(active.type)}</span>
                  {year && <span>{year}</span>}
                </p>
                <h2 id={headingId} className="t-display mt-2 text-balance">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t("trailer.close")}
                title={t("trailer.close")}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 text-white transition-[transform,background-color] duration-300 ease-out-expo hover:bg-white/20 active:scale-95 pointer-coarse:min-h-11"
              >
                <kbd className="t-caption hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans sm:inline">Esc</kbd>
                <X aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </header>

            <div className="relative aspect-video overflow-hidden rounded-card bg-black shadow-violet-lg ring-1 ring-white/10">
              {backdrop && (
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 64rem, 100vw"
                  unoptimized
                  className="scale-110 object-cover opacity-40 blur-xl"
                />
              )}
              <div
                className={cn(
                  "absolute inset-0 grid place-items-center transition-opacity duration-500",
                  loaded && "pointer-events-none opacity-0",
                )}
              >
                <span
                  role="status"
                  aria-label={t("trailer.loading")}
                  className="size-10 animate-spin rounded-full border-2 border-white/25 border-t-white"
                />
              </div>
              <iframe
                key={active.key}
                title={t("trailer.title", { title })}
                src={`https://www.youtube-nocookie.com/embed/${active.key}?autoplay=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&hl=${locale}`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                onLoad={() => setLoaded(true)}
                className={cn(
                  "absolute inset-0 size-full transition-opacity duration-500",
                  loaded ? "opacity-100" : "opacity-0",
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="t-body min-w-0 flex-1 text-white/80 [overflow-wrap:anywhere]">{active.name}</p>
              <a
                href={`https://www.youtube.com/watch?v=${active.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="t-meta inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 transition-colors duration-200 hover:bg-white/20 pointer-coarse:min-h-11"
              >
                {t("trailer.openYoutube")}
                <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
              </a>
            </div>

            {playlist.length > 1 && (
              <section aria-label={t("trailer.more")}>
                <h3 className="t-meta mb-2 text-white/70">{t("trailer.more")}</h3>
                <ul className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-1">
                  {playlist.map((v) => {
                    const on = v.key === active.key;
                    return (
                      <li key={v.key} className="w-44 shrink-0 sm:w-52">
                        <button
                          type="button"
                          aria-current={on ? "true" : undefined}
                          onClick={() => play(v.key)}
                          className="group block w-full text-left"
                        >
                          <span
                            className={cn(
                              "relative block aspect-video overflow-hidden rounded-xl bg-white/10 ring-2 transition-[box-shadow] duration-300 ease-out-expo",
                              on ? "ring-violet" : "ring-transparent group-hover:ring-white/40",
                            )}
                          >
                            <Image
                              src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                              alt=""
                              fill
                              sizes="208px"
                              unoptimized
                              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
                            />
                            <span className="absolute inset-0 grid place-items-center bg-black/25">
                              <Play aria-hidden className="size-5 fill-white text-white" />
                            </span>
                          </span>
                          <span className="t-caption mt-1.5 block text-white/60">{typeLabel(v.type)}</span>
                          <span className="t-meta line-clamp-1 block">{v.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}