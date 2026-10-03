import { NextResponse } from "next/server";
import { isAiEnabled } from "@/lib/ai/config";
import { runAgent } from "@/lib/ai/agent";
import { checkLimits, visitorId } from "@/lib/ai/ratelimit";
import {
  AI_LIMITS,
  type AiEvent,
  type AiHistoryTurn,
  type AiRequest,
  type AiWatchedBrief,
} from "@/lib/ai/types";
import { isLocale } from "@/lib/i18n/config";

// Always run on demand; a response is never cached or shared between visitors.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The agent makes up to four model calls plus catalog lookups. Lower this if your hosting plan caps it.
export const maxDuration = 60;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return req.headers.get("sec-fetch-site") === "same-origin";
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

function parseBody(raw: unknown): AiRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (!isLocale(b.locale)) return null;
  const mode = b.mode === "foryou" ? "foryou" : "ask";

  const history: AiHistoryTurn[] = Array.isArray(b.history)
    ? b.history
        .slice(-AI_LIMITS.history)
        .map((h): AiHistoryTurn | null => {
          const e = h as Record<string, unknown>;
          const text = clean(e?.text, AI_LIMITS.historyText);
          return text && (e.role === "user" || e.role === "assistant") ? { role: e.role, text } : null;
        })
        .filter((h): h is AiHistoryTurn => h !== null)
    : [];

  if (mode === "ask") {
    const message = clean(b.message, AI_LIMITS.message);
    if (!message) return null;
    return { mode, message, history, locale: b.locale };
  }

  const watched: AiWatchedBrief[] = Array.isArray(b.watched)
    ? b.watched
        .slice(0, AI_LIMITS.watched)
        .map((w): AiWatchedBrief | null => {
          const e = w as Record<string, unknown>;
          const title = clean(e?.title, 80);
          const id = typeof e?.id === "number" ? Math.round(e.id) : NaN;
          const rating = typeof e?.rating === "number" ? Math.min(Math.max(Math.round(e.rating), 1), 10) : NaN;
          if (!title || !Number.isFinite(id) || !Number.isFinite(rating)) return null;
          if (e.type !== "movie" && e.type !== "tv") return null;
          return { type: e.type, id, title, year: clean(e.year, 4) || null, rating };
        })
        .filter((w): w is AiWatchedBrief => w !== null)
    : [];
  if (watched.length === 0) return null;
  return { mode, watched, history, locale: b.locale };
}

export async function POST(req: Request) {
  if (!isAiEnabled()) return json({ error: "disabled" }, 503);
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);

  const raw = await req.text();
  if (raw.length > 20_000) return json({ error: "too_large" }, 413);
  let body: AiRequest | null = null;
  try {
    body = parseBody(JSON.parse(raw));
  } catch {
    body = null;
  }
  if (!body) return json({ error: "bad_request" }, 400);
  const request: AiRequest = body;

  const limit = await checkLimits(await visitorId(req));
  if (!limit.ok) {
    return json({ error: limit.reason === "site" || limit.reason === "error" ? "busy" : "rate", retryAfter: limit.retryAfter }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AiEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The visitor closed the panel; nothing left to send.
        }
      };
      try {
        await runAgent({ ...request, signal: req.signal, emit });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}