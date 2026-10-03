import type { Locale } from "@/lib/i18n/config";
import type { MediaType } from "@/lib/types";

/** Shared by the API route, the agent and the chat panel. Nothing here touches the server environment. */

export const AI_LIMITS = {
  /** Characters in one question. */
  message: 300,
  /** Earlier turns sent along for context. */
  history: 6,
  historyText: 600,
  /** Titles from My list sent for "recommend from my list". */
  watched: 30,
} as const;

export type AiMode = "ask" | "foryou";

export interface AiHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AiWatchedBrief {
  type: MediaType;
  id: number;
  title: string;
  year: string | null;
  /** The visitor's own rating, 1 to 10. */
  rating: number;
}

export interface AiRequest {
  mode: AiMode;
  message?: string;
  history?: AiHistoryTurn[];
  watched?: AiWatchedBrief[];
  locale: Locale;
}

export interface AiPick {
  type: MediaType;
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  rating: number;
  reason: string;
}

/** What the agent is doing right now. The panel turns these into words in the visitor's language. */
export type AiStatusKey = "search" | "discover" | "keyword" | "details" | "recommend" | "thinking";

export type AiErrorCode = "generic" | "rate" | "disabled" | "blocked" | "busy";

/** One JSON object per line in the response stream. */
export type AiEvent =
  | { type: "status"; key: AiStatusKey }
  | { type: "result"; message: string; picks: AiPick[]; filters: string[] }
  | { type: "error"; code: AiErrorCode; retryAfter?: number };
