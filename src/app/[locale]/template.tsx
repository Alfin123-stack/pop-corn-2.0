import type { ReactNode } from "react";

/** A template remounts on every navigation, so each page replays its entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
