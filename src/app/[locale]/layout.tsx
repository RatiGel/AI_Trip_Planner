import type { Metadata } from "next";
import { Inter, Noto_Sans_Georgian, DM_Serif_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AiChatFab } from "@/components/site/ai-chat-fab";
import { EditTargetProvider } from "@/components/superadmin/edit-target";
import { SuperadminEditBar } from "@/components/superadmin/edit-bar";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { getAdminConfig, buildThemeCss } from "@/lib/get-admin-config";
import { getSiteConfig } from "@/lib/get-site-config";
import { resolveHeader, resolveFooter } from "@/lib/site-config-resolve";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const georgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }
  // x-default → default locale so Google doesn't pick the redirecting root.
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s · ${t("name")}`,
    },
    description: t("tagline"),
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages,
    },
    icons: {
      icon: [
        {
          url: "/explore-tbilisi-favicon.png",
          type: "image/png",
          media: "(prefers-color-scheme: light)",
        },
        {
          url: "/explore-tbilisi-favicon-dark.png",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
        },
      ],
      apple: "/explore-tbilisi-favicon-dark.png",
    },
    verification: {
      google: "wsGn1a6OGiXV4KIA9TcxFKcgThC6J4Q1iHmyTNBs9u0",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [adminConfig, siteConfig] = await Promise.all([
    getAdminConfig(),
    getSiteConfig(),
  ]);
  const themeCss = adminConfig ? buildThemeCss(adminConfig) : null;
  const header = resolveHeader(siteConfig?.header);
  const footer = resolveFooter(siteConfig?.footer);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${georgian.variable} ${dmSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Browser extensions (Grammarly, password managers) stamp attributes
          onto body before React hydrates, which reads as a mismatch we cannot
          fix from here. suppressHydrationWarning does not inherit from html, so
          body needs its own — it silences the attribute diff on this element
          only, not on anything rendered inside it. */}
      <body
        className="min-h-full flex flex-col font-sans bg-background text-foreground"
        suppressHydrationWarning
      >
        {themeCss && (
          <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        )}
        <NextIntlClientProvider>
          <Providers>
            <EditTargetProvider>
              <SiteHeader config={header} />
              <main className="flex-1">{children}</main>
              <SiteFooter config={footer} />
              <AiChatFab />
              <SuperadminEditBar />
              <Toaster richColors position="top-center" />
            </EditTargetProvider>
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
