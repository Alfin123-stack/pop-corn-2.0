import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Container className="py-16">
      <EmptyState
        photo="reel"
        title={t("notfound.title")}
        action={{ label: t("notfound.action"), href: "/" }}
      >
        {t("notfound.body")}
      </EmptyState>
    </Container>
  );
}
