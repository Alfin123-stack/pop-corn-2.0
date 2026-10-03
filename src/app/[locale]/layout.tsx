import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "@fontsource-variable/instrument-sans";
import "@fontsource/young-serif";
import "../globals.css";
import { Footer } from "@/components/footer";
import { I18nProvider } from "@/components/i18n-provider";
import { LocaleBanner } from "@/components/locale-banner";
import { AskAi } from "@/components/ask-ai";
import { NavTracker } from "@/components/back-button";
import { BootScript } from "@/components/boot-script";
import { SiteNav } from "@/components/site-nav";
import { WatchedProvider } from "@/components/watched-provider";
import { isAiEnabled } from "@/lib/ai/config";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { getI18n, setRequestLocale } from "@/lib/i18n/server";
import { SITE_NAME, siteUrl } from "@/lib/seo";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

// English at /, Indonesian at /id. Any other locale is a 404 (see the isLocale() check in the layout and pages).
// Do NOT set `export const dynamicParams = false` here: it is inherited by every page below, so in production
// /movie/[id] and /tv/[id] (generated on first visit) would answer 404 for every title.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  setRequestLocale(locale);
  const { t } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: t("meta.description"),
    applicationName: SITE_NAME,
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
};

/**
 * Runs before first paint. Marks the document as script-enabled (scroll reveals only hide content
 * when they can also show it) and applies the saved theme, so there is no flash of the wrong palette.
 */
const BOOT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var p=localStorage.getItem('popcorn-theme');if(p!=='light'&&p!=='dark')p='system';var r=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;d.dataset.theme=r;d.dataset.themePref=p;}catch(e){d.dataset.theme='light';d.dataset.themePref='system';}})();`;

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  setRequestLocale(raw);
  const { locale, dict } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <BootScript code={BOOT_SCRIPT} />
      </head>
      <body>
        <NavTracker />
        <I18nProvider locale={locale} dict={dict}>
          <WatchedProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteNav />
              <main id="content" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <LocaleBanner />
            <AskAi enabled={isAiEnabled()} />
          </WatchedProvider>
        </I18nProvider>
      </body>
    </html>
  );
}