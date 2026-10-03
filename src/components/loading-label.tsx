"use client";

import { useI18n } from "./i18n-provider";

/** Screen-reader text for the loading skeleton. */
export function LoadingLabel() {
  const { t } = useI18n();
  return (
    <span className="sr-only" role="status">
      {t("loading.text")}
    </span>
  );
}
