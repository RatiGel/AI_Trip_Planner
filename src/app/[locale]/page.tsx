import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/site/home/hero-section";
import { StatsBar } from "@/components/site/home/stats-bar";
import { CategoriesStrip } from "@/components/site/home/categories-strip";
import { FeaturedPlaces } from "@/components/site/home/featured-places";
import { NeighborhoodsSection } from "@/components/site/home/neighborhoods-section";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";
import { ListBusinessSection } from "@/components/site/home/list-business-section";
import { mockPlaces } from "@/lib/mock/places";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { getSiteConfig } from "@/lib/get-site-config";
import { resolvePage } from "@/lib/site-config-resolve";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "homePage.meta" });
  return buildMetadata({
    locale,
    path: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const featuredPlaces = mockPlaces.slice(0, 4);

  const siteConfig = await getSiteConfig();
  const raw = siteConfig?.pages;
  const homeRaw = raw instanceof Map ? raw.get("home") : (raw as Record<string, unknown> | undefined)?.home;
  const home = resolvePage(homeRaw, "home");

  return (
    <div style={{ background: "var(--site-bg-base)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ExploreTbilisi",
          alternateName: "Explore Tbilisi",
          url: `${SITE_URL}/${locale}`,
          inLanguage: locale,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${SITE_URL}/${locale}/discover?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ExploreTbilisi",
          url: `${SITE_URL}/${locale}`,
          logo: `${SITE_URL}/explore-tbilisi-favicon.png`,
          description:
            "AI trip planner and travel guide for Tbilisi, Georgia — attractions, food, neighborhoods, maps and public-transit routes.",
        }}
      />
      <HeroSection title={home.heroTitle} subtitle={home.heroSubtitle} imageUrl={home.heroImageUrl} />
      <StatsBar />
      {home.showCategories && <CategoriesStrip />}
      {home.showFeaturedPlaces && <FeaturedPlaces places={featuredPlaces} />}
      <NeighborhoodsSection />
      <AIPlannerCTA />
      <ListBusinessSection />
    </div>
  );
}
