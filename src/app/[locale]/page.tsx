import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/site/home/hero-section";
import { StatsBar } from "@/components/site/home/stats-bar";
import { CategoriesStrip } from "@/components/site/home/categories-strip";
import { FeaturedPlaces } from "@/components/site/home/featured-places";
import { NeighborhoodsSection } from "@/components/site/home/neighborhoods-section";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";
import { ListBusinessSection } from "@/components/site/home/list-business-section";
import { getHomeLayout } from "@/lib/home-layout";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { order, hero, featured } = await getHomeLayout();

  // Each section key maps to its element. Sections render in `order`; any key
  // not in `order` is hidden. An empty/default config renders all seven.
  const sections: Record<string, React.ReactNode> = {
    hero: (
      <HeroSection
        title={hero.title}
        subtitle={hero.subtitle}
        imageUrl={hero.imageUrl}
      />
    ),
    stats: <StatsBar />,
    categories: <CategoriesStrip />,
    featured: <FeaturedPlaces places={featured} />,
    neighborhoods: <NeighborhoodsSection />,
    aiCta: <AIPlannerCTA />,
    listBusiness: <ListBusinessSection />,
  };

  return (
    <div style={{ background: "var(--site-bg-base)" }}>
      {order.map((key) =>
        sections[key] ? (
          <div key={key}>{sections[key]}</div>
        ) : null
      )}
    </div>
  );
}
