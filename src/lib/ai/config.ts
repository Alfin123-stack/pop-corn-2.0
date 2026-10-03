/** Server-only settings for the AI assistant. Every value comes from the environment. */

export const AI_MAX_TOOL_ROUNDS = 4;

export function aiApiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function aiModel(): string {
  return process.env.AI_MODEL?.trim() || "gemini-3.5-flash";
}

/** The assistant is hidden unless a key is set. AI_ENABLED=false is the kill switch. */
export function isAiEnabled(): boolean {
  return Boolean(aiApiKey()) && process.env.AI_ENABLED?.trim().toLowerCase() !== "false";
}

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function aiLimits() {
  return {
    /** Questions per visitor in 10 minutes. */
    ip10min: intEnv("AI_IP_LIMIT", 8),
    /** Questions per visitor per day. */
    ipDay: intEnv("AI_IP_DAY_LIMIT", 40),
    /** Questions for the whole site per day: the spending cap. */
    globalDay: intEnv("AI_DAILY_LIMIT", 500),
  };
}
