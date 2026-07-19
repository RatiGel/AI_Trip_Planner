import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Star, Filter } from "lucide-react";
import { mockPlaces } from "@/lib/mock/places";
import { mockCategories } from "@/lib/mock/categories";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { FaqBlock } from "@/components/site/faq-block";
import { RelatedGuides } from "@/components/site/related-guides";

const CATEGORY_LABELS: Record<string, string> = {
  sight: "Sightseeing",
  museum: "Museums",
  cafe: "Cafes",
  restaurant: "Restaurants",
  nightlife: "Nightlife",
  park: "Parks",
  wellness: "Wellness",
  market: "Markets",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "discoverPage.meta" });
  return buildMetadata({
    locale,
    path: "/discover",
    title: t("title"),
    description: t("description"),
  });
}

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tbilisi Attractions",
    url: "https://exploretbilisi.online/en/discover",
  };

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <JsonLd data={collectionSchema} />
      {/* Page hero */}
      <div className="relative flex items-end overflow-hidden" style={{ height: 400, paddingTop: 72 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            Explore Tbilisi
          </p>
          <h1
            className="font-display leading-tight text-white"
            style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}
          >
            Discover the <em className="italic" style={{ color: "#F5C842" }}>City</em>
          </h1>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="sticky z-30 px-6 md:px-12"
        style={{ top: 72, background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto py-4 scrollbar-hide">
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-white transition-colors"
            style={{ background: "#B5271D" }}
          >
            <Filter className="size-3.5" /> All
          </button>
          {mockCategories.map((cat) => (
            <button
              key={cat.slug}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {CATEGORY_LABELS[cat.slug] ?? cat.slug}
            </button>
          ))}
        </div>
      </div>

      {/* Places grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockPlaces.map((place) => (
            <Link key={place.id} href={`/places/${place.slug}`} className="group block">
              <div className="overflow-hidden rounded-2xl" style={{ background: "#1E1E1E" }}>
                <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
                  <Image
                    src={place.images?.[0] ?? "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600&q=75"}
                    alt={place.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ background: "#B5271D" }}
                  >
                    {place.categories[0]}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-display mb-1 text-lg text-white">{place.name}</h3>
                  <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-white/45">{place.description}</p>
                  <div className="flex items-center justify-between">
                    {place.rating && (
                      <span className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#E8A020" }}>
                        <Star className="size-3.5 fill-current" /> {place.rating}
                        <span className="text-white/30 font-normal">({place.reviewCount})</span>
                      </span>
                    )}
                    <span className="text-[12px] text-white/30">{"$".repeat(place.priceLevel ?? 1)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <FaqBlock namespace="discoverPage.faq" />
      <RelatedGuides namespace="discoverPage.related" />
    </div>
  );
}
