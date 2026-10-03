import { isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "popcorn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(isLocale(locale) ? locale : "en");
  const { t } = await getI18n();
  return renderOg({ title: t("footer.tagline") });
}
