"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const QUICK_NAV = [
  "firstTime",
  "gettingAround",
  "neighborhoods",
  "safety",
  "etiquette",
  "accessibility",
  "weather",
  "apps",
  "faq",
] as const;

const ANCHORS: Record<(typeof QUICK_NAV)[number], string> = {
  firstTime: "first-time",
  gettingAround: "getting-around",
  neighborhoods: "neighborhoods",
  safety: "safety",
  etiquette: "etiquette",
  accessibility: "accessibility",
  weather: "weather",
  apps: "apps",
  faq: "faq",
};

export function TravelHero() {
  const t = useTranslations("travelInfoPage.hero");
  const tn = useTranslations("travelInfoPage.nav");

  return (
    <section
      className="relative overflow-hidden px-6 pb-16 pt-28 md:px-12 md:pb-20 md:pt-36"
      style={{
        background:
          "linear-gradient(160deg, #1a0d05 0%, #241207 45%, var(--site-bg-base) 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(232,160,32,0.16) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(181,39,29,0.14) 0%, transparent 55%)",
        }}
      />

      <motion.div
        className="relative z-10 mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: EASE }}
      >
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[2px]"
          style={{
            borderColor: "rgba(232,160,32,0.3)",
            background: "rgba(232,160,32,0.12)",
            color: "#F5C842",
          }}
        >
          ✦ {t("eyebrow")}
        </div>

        <h1
          className="font-display mb-5 leading-[0.95] text-white"
          style={{ fontSize: "clamp(40px, 7vw, 76px)", letterSpacing: "-2px" }}
        >
          {t("title")}
        </h1>

        <p
          className="mx-auto max-w-xl font-light leading-relaxed text-white/70"
          style={{ fontSize: "clamp(15px, 2vw, 19px)" }}
        >
          {t("sub")}
        </p>
      </motion.div>

      {/* Quick nav chips */}
      <motion.div
        className="relative z-10 mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2.5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
      >
        {QUICK_NAV.map((key) => (
          <a
            key={key}
            href={`#${ANCHORS[key]}`}
            className="rounded-full border px-4 py-2 text-[13px] font-medium text-white/75 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {tn(key)}
          </a>
        ))}
      </motion.div>
    </section>
  );
}
