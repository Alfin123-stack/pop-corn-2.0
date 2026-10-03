import { aiLimits } from "./config";

/**
 * Fixed-window counters in Upstash Redis (the Vercel Marketplace store), over its REST API so there is no
 * extra dependency. Without Redis it falls back to counters in memory, which only work per server instance:
 * fine for development, weak in production.
 */

const TEN_MIN = 600;
const DAY = 86_400;

function redisConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  return url && token ? { url, token } : null;
}

type Command = Array<string | number>;

async function pipeline(cfg: { url: string; token: string }, commands: Command[]): Promise<number[]> {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return data.map((d) => (typeof d.result === "number" ? d.result : 0));
}

const memory = new Map<string, { count: number; expires: number }>();

function memoryHit(key: string, ttl: number): number {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.expires < now) {
    memory.set(key, { count: 1, expires: now + ttl * 1000 });
    if (memory.size > 5000) for (const [k, v] of memory) if (v.expires < now) memory.delete(k);
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

async function hit(keys: Array<{ key: string; ttl: number }>): Promise<number[]> {
  const cfg = redisConfig();
  if (!cfg) return keys.map((k) => memoryHit(k.key, k.ttl));
  return pipeline(
    cfg,
    keys.flatMap((k) => [["INCR", k.key], ["EXPIRE", k.key, k.ttl]] as Command[]),
  ).then((all) => keys.map((_, i) => all[i * 2]));
}

/** A short anonymous id for the visitor, so raw IP addresses are never stored. */
export async function visitorId(req: Request): Promise<string> {
  const ip =
    req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bytes = new TextEncoder().encode(`popcorn-ai:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type LimitResult = { ok: true } | { ok: false; reason: "visitor" | "site" | "error"; retryAfter: number };

export async function checkLimits(visitor: string): Promise<LimitResult> {
  const limits = aiLimits();
  const now = Date.now();
  const window = Math.floor(now / (TEN_MIN * 1000));
  const day = new Date(now).toISOString().slice(0, 10);

  try {
    const [short, daily] = await hit([
      { key: `popcorn:ai:v10:${visitor}:${window}`, ttl: TEN_MIN + 60 },
      { key: `popcorn:ai:vday:${visitor}:${day}`, ttl: DAY + 3600 },
    ]);
    if (short > limits.ip10min) {
      return { ok: false, reason: "visitor", retryAfter: TEN_MIN - (Math.floor(now / 1000) % TEN_MIN) };
    }
    if (daily > limits.ipDay) {
      return { ok: false, reason: "visitor", retryAfter: DAY - (Math.floor(now / 1000) % DAY) };
    }
    const [site] = await hit([{ key: `popcorn:ai:site:${day}`, ttl: DAY + 3600 }]);
    if (site > limits.globalDay) {
      return { ok: false, reason: "site", retryAfter: DAY - (Math.floor(now / 1000) % DAY) };
    }
    return { ok: true };
  } catch {
    // Redis is configured but unreachable: refuse rather than run without a spending cap.
    return { ok: false, reason: "error", retryAfter: 60 };
  }
}
