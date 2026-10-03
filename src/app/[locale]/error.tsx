"use client";

import Link from "@/components/locale-link";
import { Container } from "@/components/container";
import { useI18n } from "@/components/i18n-provider";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-[32.5rem] rounded-card bg-surface p-8 shadow-soft">
        <h1 className="t-display">{t("error.title")}</h1>
        <p className="t-lead mt-3 text-muted">
          {t("error.body")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="t-strong inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-on-ink">
            {t("error.retry")}
          </button>
          <Link href="/" className="t-strong inline-flex min-h-11 items-center rounded-full border border-hairline px-5 py-2.5">
            {t("error.home")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
