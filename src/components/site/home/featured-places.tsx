"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Place } from "@/types";

const BADGE_COLORS: Record<string, string> = {
  sight: "#B5271D",
  museum: "#7C3AED",
  cafe: "#0891B2",
  restaurant: "#D97706",
  nightlife: "#DB2777",
  park: "#16A34A",
  wellness: "#0D9488",
};

function PlaceCard({ place, featured = false }: { place: Place; featured?: boolean }) {
  const badge = place.categories[0] ?? "sight";
  const img = place.images?.[0] ?? "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=900&q=80";

  return (
    <motion.div
      className={`group overflow-hidden rounded-2xl${featured ? " md:col-span-2" : ""}`}
      style={{ background: "var(--site-bg-elevated)" }}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6 }}
    >
      <Link href={`/places/${place.slug}`} className="block">
        {/* Image */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: featured ? "16/9" : "16/10" }}
        >
          <Image
            src={img}
            alt={place.name}
            fill
            className="object-cover transition-transform duration-600 group-hover:scale-105"
          />
        </div>

        {/* Body */}
        <div className="p-5">
          <span
            className="mb-2.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-white"
            style={{ background: BADGE_COLORS[badge] ?? "#B5271D" }}
          >
            {badge}
          </span>
          <h3 className="font-display mb-1.5 text-xl" style={{ color: "var(--site-text)" }}>{place.name}</h3>
          <p className="line-clamp-2 text-[13px] leading-relaxed" style={{ color: "var(--site-text-50)" }}>{place.description}</p>
          <div className="mt-3 flex items-center gap-3">
            {place.rating && (
              <span className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#E8A020" }}>
                <Star className="size-3.5 fill-current" />
                {place.rating}
              </span>
            )}
            <span className="text-[12px]" style={{ color: "var(--site-text-35)" }}>
              {"$".repeat(place.priceLevel ?? 1)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturedPlaces({ places }: { places: Place[] }) {
  const t = useTranslations("featuredSection");
  const [featured, ...rest] = places.slice(0, 4);

  return (
    <section style={{ background: "var(--site-bg-base)" }} className="px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-3">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            {t("eyebrow")}
          </p>
          <div className="flex items-end justify-between gap-4">
            <h2
              className="font-display hyphens-auto min-w-0 break-words leading-tight"
              style={{ fontSize: "clamp(28px, 5vw, 56px)", letterSpacing: "-0.02em", color: "var(--site-text)" }}
            >
              {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
            </h2>
            <Link
              href="/discover"
              className="hidden items-center gap-1.5 text-sm font-semibold transition-colors hover:text-white md:flex"
              style={{ color: "#E8A020" }}
            >
              {t("viewAll")} <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="mt-3 max-w-xl text-base" style={{ color: "var(--site-text-40)" }}>
            {t("description")}
          </p>
        </div>

        {/* Grid */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {featured && <PlaceCard place={featured} featured />}
          {rest.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
