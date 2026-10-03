import Image from "next/image";
import Link from "@/components/locale-link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { unsplash, type PhotoKey } from "@/lib/images";
import { Reveal } from "./reveal";

interface EmptyStateProps {
  photo: PhotoKey;
  title: string;
  children?: ReactNode;
  action?: { label: string; href: string };
}

/** An empty screen is an invitation to act: photo, one sentence, one action. */
export function EmptyState({ photo, title, children, action }: EmptyStateProps) {
  return (
    <Reveal>
      <div className="group mx-auto grid max-w-[55rem] overflow-hidden rounded-card bg-surface shadow-soft md:grid-cols-2">
        <div className="relative min-h-[13.75rem] overflow-hidden md:min-h-[20rem]">
          <Image
            src={unsplash(photo, 900)}
            alt=""
            fill
            sizes="(min-width: 768px) 440px, 100vw"
            className="object-cover transition-transform duration-[1600ms] ease-out-expo group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-10">
          <h2 className="t-display">{title}</h2>
          {children && <div className="t-lead text-muted">{children}</div>}
          {action && (
            <Link
              href={action.href}
              className="group/cta t-strong mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-on-ink transition-transform duration-300 ease-spring hover:scale-105 active:scale-95"
            >
              {action.label}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-300 ease-spring group-hover/cta:translate-x-1"
              />
            </Link>
          )}
        </div>
      </div>
    </Reveal>
  );
}
