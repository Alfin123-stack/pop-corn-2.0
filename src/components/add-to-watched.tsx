"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { StarRating } from "./star-rating";
import { useWatched, type WatchedDraft } from "./watched-provider";

export function AddToWatched({ draft }: { draft: WatchedDraft }) {
  const { t } = useI18n();
  const { ready, get, add, setRating, remove } = useWatched();
  const [pending, setPending] = useState(0);
  const saved = get(draft.mediaType, draft.id);

  return (
    <div className="rounded-card bg-surface p-5 shadow-soft">
      <h2 className="t-strong">{t("rate.title")}</h2>

      {!ready ? (
        <div className="shimmer mt-4 h-16 rounded-xl" />
      ) : saved ? (
        // key restarts the entrance animation when the state flips from "rate" to "saved".
        <div key="saved" className="anim-rise mt-3">
          <p className="t-body inline-flex items-center gap-2 text-muted">
            <span className="anim-pop grid size-5 place-items-center rounded-full bg-ink text-on-ink">
              <Check aria-hidden className="size-3" strokeWidth={3} />
            </span>
            {t("rate.onList")}
          </p>
          <StarRating
            className="mt-3 flex-wrap"
            size={20}
            value={saved.userRating}
            onChange={(n) => setRating(draft.mediaType, draft.id, n)}
          />
          <button
            type="button"
            onClick={() => remove(draft.mediaType, draft.id)}
            className="t-strong mt-4 min-h-11 rounded-full border border-hairline px-4 py-2 hover:border-ink"
          >
            {t("rate.remove")}
          </button>
        </div>
      ) : (
        <div key="rate" className="anim-fade mt-3">
          <p className="t-body text-muted">
            {draft.mediaType === "movie" ? t("rate.promptMovie") : t("rate.promptTv")}
          </p>
          <StarRating className="mt-3 flex-wrap" size={20} value={pending} onChange={setPending} />
          <button
            type="button"
            disabled={pending === 0}
            onClick={() => add(draft, pending)}
            className="t-strong mt-4 min-h-11 rounded-full bg-ink px-5 py-2.5 text-on-ink transition-[transform,background-color,box-shadow] duration-300 ease-spring enabled:hover:scale-105 enabled:hover:shadow-float disabled:bg-stone disabled:text-white"
          >
            {t("rate.add")}
          </button>
        </div>
      )}
    </div>
  );
}
