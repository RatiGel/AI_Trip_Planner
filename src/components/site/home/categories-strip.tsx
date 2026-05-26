"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CategoriesStrip() {
  const t = useTranslations("categoriesSection");

  const CATEGORIES = [
    { slug: "food", label: t("food"), count: 24, icon: "🍷", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=75" },
    { slug: "nightlife", label: t("nightlife"), count: 18, icon: "🎵", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=75" },
    { slug: "museum", label: t("culture"), count: 31, icon: "🏛️", img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=75" },
    { slug: "nature", label: t("nature"), count: 12, icon: "🌿", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=75" },
  ];

  return (
    <section style={{ background: "#141414" }} className="px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
              {t("eyebrow")}
            </p>
            <h2 className="font-display leading-tight tracking-tight text-white"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-1.5px" }}>
              {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
            </h2>
          </div>
          <Link
            href="/discover"
            className="hidden text-sm font-semibold transition-colors hover:text-white md:block"
            style={{ color: "#E8A020" }}
          >
            {t("seeAll")}
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link href={`/discover?category=${cat.slug}`} className="group block">
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{ aspectRatio: "1/1.1" }}
                >
                  <Image
                    src={cat.img}
                    alt={cat.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover color overlay */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "linear-gradient(135deg, rgba(181,39,29,0.65), rgba(232,160,32,0.4))" }}
                  />
                  {/* Info */}
                  <div
                    className="absolute inset-x-0 bottom-0 px-5 pb-6"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}
                  >
                    <span className="mb-1.5 block text-2xl">{cat.icon}</span>
                    <p className="font-display text-lg text-white">{cat.label}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">{cat.count} {t("places")}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
