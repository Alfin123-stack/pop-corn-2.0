import { aiApiKey, aiModel } from "./config";

/**
 * A small client for the Gemini REST API (generateContent with function calling). Gemini 3 models require
 * the `thoughtSignature` of every model turn that contains a function call to be sent back unchanged, so
 * model turns are stored exactly as they arrive and appended to the history untouched.
 */

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  [key: string]: unknown;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export type GeminiFailure = "unavailable" | "blocked" | "bad_response" | "timeout";

export class GeminiError extends Error {
  code: GeminiFailure;
  constructor(code: GeminiFailure, message: string) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
  }
}

interface GenerateInput {
  system: string;
  contents: GeminiContent[];
  tools: GeminiToolDeclaration[];
  /** Makes the model call exactly this tool (used for the last round, so an answer is guaranteed). */
  forceTool?: string;
  signal?: AbortSignal;
}

export async function generate({ system, contents, tools, forceTool, signal }: GenerateInput): Promise<GeminiContent> {
  const key = aiApiKey();
  if (!key) throw new GeminiError("unavailable", "GEMINI_API_KEY is not set");

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: 2048 },
  };
  if (tools.length > 0) {
    body.tools = [{ functionDeclarations: tools }];
    body.toolConfig = {
      functionCallingConfig: forceTool ? { mode: "ANY", allowedFunctionNames: [forceTool] } : { mode: "AUTO" },
    };
  }

  const timeout = AbortSignal.timeout(25_000);
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiModel())}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
  } catch (err) {
    const name = (err as { name?: string }).name;
    throw new GeminiError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "unavailable", String(err));
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 400);
    console.error(`[ai] Gemini ${res.status}: ${detail}`);
    // 429 is quota, 401/403 a bad key or billing problem, 5xx Google having a bad moment: all "try later".
    throw new GeminiError(res.status === 400 ? "bad_response" : "unavailable", `Gemini ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { role?: string; parts?: GeminiPart[] }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) throw new GeminiError("blocked", data.promptFeedback.blockReason);

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!parts || parts.length === 0) {
    const reason = candidate?.finishReason ?? "no candidates";
    if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCKLIST") {
      throw new GeminiError("blocked", reason);
    }
    throw new GeminiError("bad_response", `Empty response (${reason})`);
  }
  return { role: "model", parts };
}
