import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { TravelHero } from "@/components/site/travel-info/travel-hero";
import { FirstTimeGrid } from "@/components/site/travel-info/first-time-grid";
import { GettingAround } from "@/components/site/travel-info/getting-around";
import { NeighborhoodGuide } from "@/components/site/travel-info/neighborhood-guide";
import { SafetyCard } from "@/components/site/travel-info/safety-card";
import { EtiquetteList } from "@/components/site/travel-info/etiquette-list";
import { AccessibilityCard } from "@/components/site/travel-info/accessibility-card";
import { WeatherSeasons } from "@/components/site/travel-info/weather-seasons";
import { UsefulApps } from "@/components/site/travel-info/useful-apps";
import { FaqAccordion } from "@/components/site/travel-info/faq-accordion";
import { RelatedLinks } from "@/components/site/travel-info/related-links";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "travelInfoPage.meta",
  });
  return { title: t("title"), description: t("description") };
}

export default async function TravelInfoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main style={{ background: "var(--site-bg-base)" }}>
      <TravelHero />
      <FirstTimeGrid />
      <GettingAround />
      <NeighborhoodGuide />
      <SafetyCard />
      <EtiquetteList />
      <AccessibilityCard />
      <WeatherSeasons />
      <UsefulApps />
      <FaqAccordion />
      <RelatedLinks />
      <AIPlannerCTA />
    </main>
  );
}
