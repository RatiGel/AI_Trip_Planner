"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function ListBusinessSection() {
  const t = useTranslations("listBusinessSection");

  return (
    <section className="px-6 py-20 md:px-12" style={{ background: "var(--site-bg-base)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mx-auto max-w-7xl"
      >
        <Link
          href="/list-your-business"
          className="group relative block overflow-hidden rounded-3xl px-8 py-14 transition-all duration-300 hover:-translate-y-1 md:px-16 md:py-16"
          style={{
            background: "linear-gradient(135deg, #1a0a08 0%, #2d1408 45%, #1a0d00 100%)",
            border: "1px solid rgba(232,160,32,0.25)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 85% 30%, rgba(232,160,32,0.18) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(181,39,29,0.18) 0%, transparent 55%)",
            }}
          />

          <div className="relative z-10 flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold tracking-wide"
                style={{
                  borderColor: "rgba(232,160,32,0.3)",
                  background: "rgba(232,160,32,0.12)",
                  color: "#F5C842",
                }}
              >
                <Store className="size-3.5" />
                {t("badge")}
              </div>

              <h2
                className="font-display hyphens-auto break-words leading-tight text-white"
                style={{ fontSize: "clamp(26px, 3.4vw, 48px)", letterSpacing: "-0.02em" }}
              >
                {t("title")}
              </h2>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
                {t("description")}
              </p>
            </div>

            <span
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-8 py-4 text-[15px] font-semibold text-white transition-all duration-250 group-hover:gap-3"
              style={{ background: "#B5271D", boxShadow: "0 8px 32px rgba(181,39,29,0.45)" }}
            >
              {t("cta")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
