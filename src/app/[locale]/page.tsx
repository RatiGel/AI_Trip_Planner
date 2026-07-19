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

  return (
    <div style={{ background: "var(--site-bg-base)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ExploreTbilisi",
          url: `${SITE_URL}/${locale}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ExploreTbilisi",
          url: `${SITE_URL}/${locale}`,
        }}
      />
      <HeroSection />
      <StatsBar />
      <CategoriesStrip />
      <FeaturedPlaces places={featuredPlaces} />
      <NeighborhoodsSection />
      <AIPlannerCTA />
      <ListBusinessSection />
    </div>
  );
}
