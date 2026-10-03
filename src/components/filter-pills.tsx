import Link from "@/components/locale-link";
import { cn, vars } from "@/lib/format";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
}

export function FilterPills({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
      <span className="t-meta shrink-0 text-muted md:w-20">{label}</span>
      {/* One swipeable row on small screens; wraps on wider ones. */}
      <ul
        className="stagger no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
        style={vars({ "--stagger-base": "120ms" })}
      >
        {options.map((o) => (
          <li key={o.href} className="shrink-0 snap-start">
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              className={cn(
                "t-body inline-flex min-h-9 items-center rounded-full border px-4 py-1.5 pointer-coarse:min-h-11 transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-out-expo active:scale-95",
                o.active
                  ? "border-ink bg-ink text-on-ink"
                  : "border-hairline bg-surface text-ink shadow-pill hover:-translate-y-0.5 hover:border-ink hover:shadow-float",
              )}
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
