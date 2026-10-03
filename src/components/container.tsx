import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[75rem] px-4 sm:px-6", className)}>{children}</div>
  );
}
