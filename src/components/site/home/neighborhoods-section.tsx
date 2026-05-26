"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function NeighborhoodsSection() {
  const t = useTranslations("neighborhoodsSection");

  const NEIGHBORHOODS = [
    {
      slug: "old-town",
      name: t("oldTownName"),
      tag: t("oldTownTag"),
      desc: t("oldTownDesc"),
      img: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=900&q=80",
    },
    {
      slug: "marjanishvili",
      name: t("marjanName"),
      tag: t("marjanTag"),
      desc: t("marjanDesc"),
      img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
    },
    {
      slug: "vake",
      name: t("vakeName"),
      tag: t("vakeTag"),
      desc: t("vakeDesc"),
      img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80",
    },
    {
      slug: "mtatsminda",
      name: t("mtatsName"),
      tag: t("mtatsTag"),
      desc: t("mtatsDesc"),
      img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
    },
  ];

  return (
    <section style={{ background: "var(--site-bg-surface)" }} className="px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
          {t("eyebrow")}
        </p>
        <h2
          className="font-display mb-3 leading-tight"
          style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-1.5px", color: "var(--site-text)" }}
        >
          {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
        </h2>
        <p className="mb-12 max-w-xl text-base" style={{ color: "var(--site-text-40)" }}>
          {t("description")}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {NEIGHBORHOODS.map((n, i) => (
            <motion.div
              key={n.slug}
              initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link href={`/discover?neighborhood=${n.slug}`} className="group relative block overflow-hidden rounded-3xl" style={{ height: 320 }}>
                <Image
                  src={n.img}
                  alt={n.name}
                  fill
                  className="object-cover transition-transform duration-600 group-hover:scale-105"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.08) 60%)" }} />

                {/* Arrow button */}
                <div
                  className="absolute right-6 top-6 flex size-10 items-center justify-center rounded-full transition-all duration-250 group-hover:rotate-0"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", rotate: "-45deg" }}
                >
                  <ArrowUpRight className="size-4 text-white transition-all duration-300 group-hover:rotate-45" />
                </div>

                {/* Info */}
                <div className="absolute inset-x-0 bottom-0 px-8 pb-8">
                  <span
                    className="mb-2.5 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[2px] backdrop-blur-sm"
                    style={{ color: "#F5C842" }}
                  >
                    {n.tag}
                  </span>
                  <h3 className="font-display mb-1.5 text-3xl text-white">{n.name}</h3>
                  <p className="text-[13px] leading-relaxed text-white/65">{n.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
