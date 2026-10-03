"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/format";

interface ImgProps {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Zooms the image when an ancestor with the `group` class is hovered. */
  hoverZoom?: "sm" | "md";
  fallbackClassName?: string;
}

/**
 * Fills its (relatively positioned) parent and fades in once loaded.
 * TMDB images are already served in fixed sizes from their CDN, so they skip the Next.js optimizer.
 */
export function Img({ src, alt, sizes, className, priority, hoverZoom, fallbackClassName }: ImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Images that finish before hydration never fire onLoad.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, [src]);

  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("grid size-full place-items-center bg-canvas text-stone", fallbackClassName)}
      >
        <Film aria-hidden className="size-6" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      ref={ref}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.includes("image.tmdb.org")}
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-cover transition-[opacity,scale] duration-700 ease-out-expo",
        loaded ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
        hoverZoom === "sm" && "group-hover:scale-[1.04]",
        hoverZoom === "md" && "group-hover:scale-[1.08]",
        className,
      )}
    />
  );
}
