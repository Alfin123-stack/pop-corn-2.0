"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Audience, MediaType } from "@/lib/types";

export interface WatchedItem {
  key: string;
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  date: string | null;
  certification: string | null;
  audience: Audience;
  /** Movie runtime, or typical episode runtime for TV (minutes). */
  runtime: number | null;
  numberOfSeasons: number | null;
  voteAverage: number;
  userRating: number;
  addedAt: number;
}

export type WatchedDraft = Omit<WatchedItem, "key" | "userRating" | "addedAt">;

interface WatchedContextValue {
  items: WatchedItem[];
  ready: boolean;
  get: (mediaType: MediaType, id: number) => WatchedItem | undefined;
  add: (draft: WatchedDraft, rating: number) => void;
  setRating: (mediaType: MediaType, id: number, rating: number) => void;
  remove: (mediaType: MediaType, id: number) => void;
}

const STORAGE_KEY = "usepopcorn:watched:v1";
const WatchedContext = createContext<WatchedContextValue | null>(null);

export const watchedKey = (mediaType: MediaType, id: number) => `${mediaType}-${id}`;

function isItem(value: unknown): value is WatchedItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WatchedItem>;
  return (
    typeof v.key === "string" &&
    typeof v.id === "number" &&
    (v.mediaType === "movie" || v.mediaType === "tv") &&
    typeof v.title === "string" &&
    typeof v.userRating === "number"
  );
}

function readStorage(): WatchedItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

export function WatchedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((update: (prev: WatchedItem[]) => WatchedItem[]) => {
    setItems((prev) => {
      const next = update(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be full or blocked; the in-memory list still works.
      }
      return next;
    });
  }, []);

  const value = useMemo<WatchedContextValue>(
    () => ({
      items,
      ready,
      get: (mediaType, id) => items.find((i) => i.key === watchedKey(mediaType, id)),
      add: (draft, rating) =>
        commit((prev) => {
          const key = watchedKey(draft.mediaType, draft.id);
          const entry: WatchedItem = { ...draft, key, userRating: rating, addedAt: Date.now() };
          return [entry, ...prev.filter((i) => i.key !== key)];
        }),
      setRating: (mediaType, id, rating) =>
        commit((prev) =>
          prev.map((i) => (i.key === watchedKey(mediaType, id) ? { ...i, userRating: rating } : i)),
        ),
      remove: (mediaType, id) =>
        commit((prev) => prev.filter((i) => i.key !== watchedKey(mediaType, id))),
    }),
    [items, ready, commit],
  );

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
}

export function useWatched(): WatchedContextValue {
  const ctx = useContext(WatchedContext);
  if (!ctx) throw new Error("useWatched must be used inside <WatchedProvider>");
  return ctx;
}
