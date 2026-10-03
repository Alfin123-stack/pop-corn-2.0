"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Inline script that must run before first paint (theme, `js` class).
 *
 * It is part of the server HTML and is adopted as is while hydrating, so it runs once, before paint.
 * Once the browser takes over it renders nothing: React 19 warns whenever a <script> element is created
 * by client-side rendering ("Scripts inside React components are never executed"), which would happen
 * if this layout were ever rendered afresh in the browser, for example after switching language.
 * Returning null on the client avoids creating one; the script has already run by then.
 */
export function BootScript({ code }: { code: string }) {
  const onServer = useSyncExternalStore(
    subscribe,
    () => false, // client snapshot
    () => true, // server render and hydration
  );
  if (!onServer) return null;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
