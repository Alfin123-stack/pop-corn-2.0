import Link from "@/components/locale-link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { Reveal } from "./reveal";

interface SectionProps {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
}

/** Labeled band: title with a chevron, 1.5rem before the content, 4rem between bands. */
export function Section({ title, href, children, className }: SectionProps) {
  const heading = (
    <span className="inline-flex items-center gap-1">
      <h2 className="t-display">{title}</h2>
      {href && (
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform duration-300 ease-spring group-hover:translate-x-1.5"
        />
      )}
    </span>
  );
  return (
    <Reveal as="section" className={cn("mt-14 md:mt-16", className)} y={28}>
      <div className="mb-6">
        {href ? (
          <Link href={href} className="group inline-flex min-h-8 items-center rounded-full pointer-coarse:min-h-11">
            {heading}
          </Link>
        ) : (
          heading
        )}
      </div>
      {children}
    </Reveal>
  );
}
