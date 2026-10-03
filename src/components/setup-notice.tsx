import { getI18n } from "@/lib/i18n/server";
import { Container } from "./container";
import { EmptyState } from "./empty-state";

export async function SetupNotice() {
  const { t } = await getI18n();
  return (
    <Container className="py-16">
      <EmptyState photo="clapper" title={t("setup.title")}>
        <p>
          {t("setup.before")}{" "}
          <code className="rounded bg-canvas px-1.5 py-0.5">.env.local</code> {t("setup.after")}
        </p>
        <pre className="t-meta mt-3 overflow-x-auto rounded-xl bg-canvas p-3 text-ink">
          TMDB_API_KEY=your_key_here
        </pre>
        <p className="mt-3">{t("setup.restart")}</p>
      </EmptyState>
    </Container>
  );
}
