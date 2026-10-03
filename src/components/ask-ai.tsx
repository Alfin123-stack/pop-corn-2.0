"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RotateCcw, Send, Sparkles, X } from "lucide-react";
import Link from "@/components/locale-link";
import type { Key } from "@/lib/i18n";
import { cn, formatScore } from "@/lib/format";
import { tmdbImage } from "@/lib/images";
import { AI_LIMITS, type AiErrorCode, type AiEvent, type AiPick, type AiStatusKey } from "@/lib/ai/types";
import { useI18n } from "./i18n-provider";
import { useWatched } from "./watched-provider";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  picks?: AiPick[];
  filters?: string[];
  error?: AiErrorCode;
  retryAfter?: number;
  pending?: boolean;
}

const STATUS_KEY: Record<AiStatusKey, Key> = {
  search: "ai.status.search",
  discover: "ai.status.discover",
  keyword: "ai.status.keyword",
  details: "ai.status.details",
  recommend: "ai.status.recommend",
  thinking: "ai.status.thinking",
};

const ERROR_KEY: Record<AiErrorCode, Key> = {
  generic: "ai.error.generic",
  rate: "ai.error.rate",
  disabled: "ai.error.disabled",
  blocked: "ai.error.blocked",
  busy: "ai.error.busy",
};

const PRESETS: Array<{ label: Key; prompt: Key }> = [
  { label: "ai.preset.1.label", prompt: "ai.preset.1.prompt" },
  { label: "ai.preset.2.label", prompt: "ai.preset.2.prompt" },
  { label: "ai.preset.3.label", prompt: "ai.preset.3.prompt" },
  { label: "ai.preset.4.label", prompt: "ai.preset.4.prompt" },
  { label: "ai.preset.5.label", prompt: "ai.preset.5.prompt" },
];

/**
 * The AI assistant: a floating button that opens a chat panel. Rendered only when the server has an AI key
 * (`enabled`). It talks to /api/ai, which streams one JSON event per line.
 */
export function AskAi({ enabled }: { enabled: boolean }) {
  const { t, locale } = useI18n();
  const { items: watched, ready } = useWatched();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const headingId = useId();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AiStatusKey>("thinking");
  const [draft, setDraft] = useState("");
  const busy = messages.some((m) => m.pending);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id: number, change: Partial<Message>) => {
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...change } : m)));
  }, []);

  const send = useCallback(
    async (mode: "ask" | "foryou", shown: string, question?: string) => {
      if (busy) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userId = nextId.current++;
      const replyId = nextId.current++;
      const history = messages
        .filter((m) => !m.pending && !m.error && m.text)
        .slice(-AI_LIMITS.history)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((all) => [
        ...all,
        { id: userId, role: "user", text: shown },
        { id: replyId, role: "assistant", text: "", pending: true },
      ]);
      setStatus("thinking");

      const fail = (code: AiErrorCode, retryAfter?: number) =>
        patch(replyId, { pending: false, error: code, retryAfter, text: "" });

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode,
            locale,
            message: question,
            history,
            watched:
              mode === "foryou"
                ? [...watched]
                    .sort((a, b) => b.userRating - a.userRating)
                    .slice(0, AI_LIMITS.watched)
                    .map((w) => ({
                      type: w.mediaType,
                      id: w.id,
                      title: w.title,
                      year: w.date ? w.date.slice(0, 4) : null,
                      rating: w.userRating,
                    }))
                : undefined,
          }),
        });

        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
          if (res.status === 429) return fail(body.error === "rate" ? "rate" : "busy", body.retryAfter);
          return fail(res.status === 503 ? "disabled" : "generic");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        const handle = (line: string) => {
          if (!line.trim()) return;
          let event: AiEvent;
          try {
            event = JSON.parse(line) as AiEvent;
          } catch {
            return;
          }
          if (event.type === "status") setStatus(event.key);
          else if (event.type === "result") {
            finished = true;
            patch(replyId, { pending: false, text: event.message, picks: event.picks, filters: event.filters });
          } else if (event.type === "error") {
            finished = true;
            fail(event.code, event.retryAfter);
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(handle);
        }
        handle(buffer);
        if (!finished) fail("generic");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        fail("generic");
      }
    },
    [busy, locale, messages, patch, watched],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    setDraft("");
    void send("ask", q, q);
  };

  const canUseList = ready && watched.length > 0;

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "t-strong fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-violet px-5 text-white shadow-violet",
          "transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-violet-lg active:scale-95",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Sparkles aria-hidden className="size-4" strokeWidth={2} />
        {t("ai.open")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="ai-dialog m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:m-auto sm:max-h-[min(44rem,92dvh)] sm:w-[min(40rem,calc(100vw-2rem))]"
      >
        <div className="flex max-h-[88dvh] flex-col overflow-hidden rounded-t-card bg-canvas shadow-float sm:max-h-[min(44rem,92dvh)] sm:rounded-card">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet text-white">
                <Sparkles aria-hidden className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h2 id={headingId} className="t-display">
                  {t("ai.title")}
                </h2>
              </div>
              <span className="t-caption rounded-full bg-surface px-2 py-0.5 text-muted shadow-pill">{t("ai.beta")}</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    abortRef.current?.abort();
                    setMessages([]);
                  }}
                  aria-label={t("ai.reset")}
                  title={t("ai.reset")}
                  className="grid size-10 place-items-center rounded-full transition-colors duration-200 hover:bg-surface pointer-coarse:size-11"
                >
                  <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("ai.close")}
                title={t("ai.close")}
                className="grid size-10 place-items-center rounded-full transition-colors duration-200 hover:bg-surface pointer-coarse:size-11"
              >
                <X aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="anim-rise">
                <p className="t-body text-muted">{t("ai.intro")}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <li key={p.label}>
                      <button
                        type="button"
                        onClick={() => void send("ask", t(p.prompt), t(p.prompt))}
                        className="t-body inline-flex min-h-9 items-center rounded-full border border-hairline bg-surface px-4 py-1.5 shadow-pill transition-[transform,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ink active:scale-95 pointer-coarse:min-h-11"
                      >
                        {t(p.label)}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      disabled={!canUseList}
                      title={canUseList ? undefined : t("ai.listEmpty")}
                      onClick={() => void send("foryou", t("ai.fromListPrompt"))}
                      className="t-body inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-on-ink transition-[transform,opacity] duration-300 ease-out-expo enabled:hover:-translate-y-0.5 enabled:active:scale-95 disabled:opacity-40 pointer-coarse:min-h-11"
                    >
                      <Sparkles aria-hidden className="size-3.5" strokeWidth={2} />
                      {t("ai.fromList")}
                    </button>
                  </li>
                </ul>
                {!canUseList && <p className="t-caption mt-2 text-muted">{t("ai.listEmpty")}</p>}
              </div>
            ) : (
              messages.map((m) => (
                <MessageView key={m.id} message={m} status={status} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>

          <form onSubmit={submit} className="border-t border-hairline bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={AI_LIMITS.message}
                placeholder={t("ai.placeholder")}
                aria-label={t("ai.placeholder")}
                className="t-body max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-canvas px-4 py-2.5 outline-none ring-1 ring-hairline transition-shadow duration-200 placeholder:text-muted focus:ring-2 focus:ring-violet"
              />
              <button
                type="submit"
                disabled={busy || draft.trim().length === 0}
                aria-label={t("ai.send")}
                title={t("ai.send")}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-violet text-white shadow-violet transition-[transform,opacity] duration-300 ease-spring enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-40"
              >
                <Send aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </div>
            <p className="t-caption mt-2 text-center text-muted">{t("ai.disclaimer")}</p>
          </form>
        </div>
      </dialog>
    </>
  );
}

function MessageView({
  message,
  status,
  onNavigate,
}: {
  message: Message;
  status: AiStatusKey;
  onNavigate: () => void;
}) {
  const { t } = useI18n();

  if (message.role === "user") {
    return (
      <div className="anim-rise flex justify-end">
        <p className="t-body max-w-[85%] rounded-2xl rounded-br-md bg-violet px-4 py-2.5 text-white [overflow-wrap:anywhere]">
          {message.text}
        </p>
      </div>
    );
  }

  if (message.pending) {
    return (
      <p role="status" aria-live="polite" className="t-body flex items-center gap-2 text-muted">
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-hairline border-t-violet" />
        {t(STATUS_KEY[status])}
      </p>
    );
  }

  if (message.error) {
    const minutes = Math.max(1, Math.ceil((message.retryAfter ?? 60) / 60));
    return (
      <p className="t-body rounded-2xl bg-surface px-4 py-3 text-muted shadow-pill">
        {t(ERROR_KEY[message.error], { minutes })}
      </p>
    );
  }

  return (
    <div className="anim-rise space-y-3">
      {message.text && <p className="t-body [overflow-wrap:anywhere]">{message.text}</p>}
      {message.filters && message.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-caption text-muted">{t("ai.filtersUsed")}</span>
          {message.filters.map((f) => (
            <span key={f} className="t-caption rounded-full bg-surface px-2.5 py-1 shadow-pill">
              {f}
            </span>
          ))}
        </div>
      )}
      {message.picks && message.picks.length > 0 && (
        <ul className="space-y-2">
          {message.picks.map((p, i) => (
            <li key={`${p.type}-${p.id}`} style={{ animationDelay: `${i * 60}ms` }} className="anim-rise">
              <PickCard pick={p} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PickCard({ pick, onNavigate }: { pick: AiPick; onNavigate: () => void }) {
  const { t, locale } = useI18n();
  const poster = tmdbImage(pick.posterPath, "w185");
  return (
    <Link
      href={`/${pick.type}/${pick.id}`}
      onClick={onNavigate}
      className="group flex gap-3 rounded-card bg-surface p-2 shadow-soft transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-float active:scale-[0.99]"
    >
      <span className="relative h-24 w-16 shrink-0 overflow-hidden rounded-inner bg-canvas">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            sizes="64px"
            unoptimized
            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 py-1 pr-2">
        <span className="t-strong line-clamp-1 block">{pick.title}</span>
        <span className="t-caption mt-0.5 flex flex-wrap items-center gap-x-2 text-muted">
          <span>{pick.type === "movie" ? t("media.movie") : t("media.tvShort")}</span>
          {pick.year && <span>{pick.year}</span>}
          {pick.rating > 0 && <span>★ {formatScore(pick.rating, locale)}</span>}
        </span>
        {pick.reason && <span className="t-body mt-1.5 line-clamp-3 block text-muted">{pick.reason}</span>}
      </span>
    </Link>
  );
}
