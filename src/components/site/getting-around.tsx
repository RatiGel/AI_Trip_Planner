"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowUpRight, Bus, Check, Clock, MapPin, ShieldCheck, Train } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RoutePlanner } from "@/components/transit/route-planner";

// tre.ge is the official Georgian Railway & intercity bus platform. It exposes
// no public API or deep-link params, so the "Travel from Tbilisi" tab hands the
// booking off to tre.ge entirely instead of showing indicative fares.
function treUrl(locale: string) {
  const path = locale === "ka" ? "" : locale === "ru" ? "/ru" : "/en";
  return `https://tre.ge${path}`;
}

type Mode = "rail" | "bus";

// Popular getaways from Tbilisi. Times/distances are indicative — real
// schedules and fares live on tre.ge, where every card links out.
const DESTINATIONS: {
  key: string;
  image: string;
  time: string;
  distance: string;
  modes: Mode[];
}[] = [
  {
    key: "Batumi",
    image: "https://images.unsplash.com/photo-1600783245891-46c8f4d3f6de?w=900&q=80",
    time: "5h 20m",
    distance: "370 km",
    modes: ["rail", "bus"],
  },
  {
    key: "Kazbegi",
    image: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=900&q=80",
    time: "3h 00m",
    distance: "155 km",
    modes: ["bus"],
  },
  {
    key: "Kutaisi",
    image: "https://images.unsplash.com/photo-1626016570496-9b10c86c8b3f?w=900&q=80",
    time: "3h 40m",
    distance: "230 km",
    modes: ["rail", "bus"],
  },
  {
    key: "Mtskheta",
    image: "https://images.unsplash.com/photo-1601565415267-724db0e9fbfc?w=900&q=80",
    time: "0h 30m",
    distance: "25 km",
    modes: ["bus"],
  },
];

const MODE_META: Record<Mode, { icon: typeof Train; labelKey: string; color: string }> = {
  rail: { icon: Train, labelKey: "destByRail", color: "#7C3AED" },
  bus: { icon: Bus, labelKey: "destByBus", color: "#0891B2" },
};

function DestinationCard({
  d,
  index,
  href,
  t,
}: {
  d: (typeof DESTINATIONS)[number];
  index: number;
  href: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--site-border-08)" }}
      aria-label={`${t(`dest${d.key}Name`)} — ${t("destExplore")}`}
    >
      {/* Hero image */}
      <div
        className="absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
        style={{
          backgroundImage: `url('${d.image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Legibility scrim */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,10,14,0.92) 8%, rgba(8,10,14,0.45) 46%, rgba(8,10,14,0.05) 100%)" }} />

      {/* Mode badges — top-left */}
      <div className="absolute left-3 top-3 flex gap-1.5">
        {d.modes.map((m) => {
          const Meta = MODE_META[m];
          const Icon = Meta.icon;
          return (
            <span
              key={m}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <Icon className="size-3" style={{ color: "#fff" }} />
              {t(Meta.labelKey)}
            </span>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 p-5">
        <h4 className="font-display text-[26px] leading-none text-white" style={{ letterSpacing: "-0.5px" }}>
          {t(`dest${d.key}Name`)}
        </h4>
        <p className="mt-1.5 text-[13px] text-white/70">{t(`dest${d.key}Tagline`)}</p>

        <div className="mt-3 flex items-center gap-4 text-[12px] font-medium text-white/85">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" style={{ color: "#F5C842" }} />
            {d.time}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" style={{ color: "#F5C842" }} />
            {d.distance}
          </span>
        </div>

        {/* Reveal CTA on hover */}
        <div className="mt-3 flex items-center gap-1 overflow-hidden text-[13px] font-semibold text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
          {t("destExplore")}
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.a>
  );
}

export function GettingAround() {
  const t = useTranslations("gettingAround");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const features = [t("treFeature1"), t("treFeature2"), t("treFeature3")];
  const href = treUrl(locale);

  return (
    <Tabs defaultValue="city" className="w-full">
      <TabsList
        className="mb-8 inline-flex !h-auto w-full gap-8 rounded-none bg-transparent p-0"
        style={{ borderBottom: "1px solid var(--site-border-08)" }}
      >
        <TabsTrigger
          value="city"
          className="group/tab relative !h-auto !flex-none items-center gap-2.5 rounded-none !border-0 !bg-transparent px-0 pt-1 pb-3.5 text-[18px] font-bold tracking-tight text-muted-foreground/55 transition-colors hover:text-foreground data-active:!bg-transparent data-active:text-foreground data-active:!shadow-none"
        >
          <Bus className="size-[18px] transition-colors group-data-active/tab:text-[#F5C842]" />
          {t("cityTab")}
          <span
            className="absolute inset-x-0 -bottom-px h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-data-active/tab:scale-x-100"
            style={{ background: "#F5C842" }}
          />
        </TabsTrigger>
        <TabsTrigger
          value="from"
          className="group/tab relative !h-auto !flex-none items-center gap-2.5 rounded-none !border-0 !bg-transparent px-0 pt-1 pb-3.5 text-[18px] font-bold tracking-tight text-muted-foreground/55 transition-colors hover:text-foreground data-active:!bg-transparent data-active:text-foreground data-active:!shadow-none"
        >
          <Train className="size-[18px] transition-colors group-data-active/tab:text-[#F5C842]" />
          {t("fromTab")}
          <span
            className="absolute inset-x-0 -bottom-px h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-data-active/tab:scale-x-100"
            style={{ background: "#F5C842" }}
          />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="city">
        <RoutePlanner />
      </TabsContent>

      <TabsContent value="from">
        {/* ── Popular destination cards ── */}
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("destHeading")}</h3>
            <p className="mt-1 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("destSubtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DESTINATIONS.map((d, i) => (
            <DestinationCard key={d.key} d={d} index={i} href={href} t={t} />
          ))}
        </div>

        {/* ── tre.ge trust strip ── */}
        <div
          className="mt-8 flex flex-col gap-6 rounded-2xl p-6 md:p-8"
          style={{ background: "var(--site-bg-elevated)", border: "1px solid rgba(8,145,178,0.3)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(8,145,178,0.15)" }}>
              <ShieldCheck className="size-6" style={{ color: "#0891B2" }} />
            </div>
            <div>
              <h3 className="text-xl font-semibold" style={{ color: "var(--site-text)" }}>{t("trePanelTitle")}</h3>
              <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--site-text-65)" }}>{t("trePanelBody")}</p>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: "#0891B2" }} />
                <span className="text-[13px] leading-snug" style={{ color: "var(--site-text-65)" }}>{f}</span>
              </li>
            ))}
          </ul>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 sm:self-start sm:px-8"
            style={{ background: "#0891B2", boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}
          >
            {t("trePanelCta")}
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </TabsContent>
    </Tabs>
  );
}
