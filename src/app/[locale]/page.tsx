import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/site/home/hero-section";
import { StatsBar } from "@/components/site/home/stats-bar";
import { CategoriesStrip } from "@/components/site/home/categories-strip";
import { FeaturedPlaces } from "@/components/site/home/featured-places";
import { NeighborhoodsSection } from "@/components/site/home/neighborhoods-section";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";
import { mockPlaces } from "@/lib/mock/places";

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
      <HeroSection />
      <StatsBar />
      <CategoriesStrip />
      <FeaturedPlaces places={featuredPlaces} />
      <NeighborhoodsSection />
      <AIPlannerCTA />
    </div>
  );
}
