"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bus, Footprints, TramFront, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { JourneyPlan, JourneyLeg, Arrival } from "@/types/transit";

function LegIcon({ mode }: { mode: JourneyLeg["mode"] }) {
  if (mode === "walk") return <Footprints className="size-4" style={{ color: "var(--site-text-50)" }} />;
  if (mode === "metro") return <TramFront className="size-4" style={{ color: "#7C3AED" }} />;
  if (mode === "bus") return <Bus className="size-4" style={{ color: "#0891B2" }} />;
  return <ArrowRight className="size-4" style={{ color: "var(--site-text-40)" }} />;
}

function useArrivals(stopId: string | undefined, locale: string) {
  const [arrivals, setArrivals] = useState<Arrival[] | null>(null);
  useEffect(() => {
    if (!stopId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transit/arrivals?stopId=${encodeURIComponent(stopId)}&locale=${locale}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { arrivals: Arrival[] };
        if (!cancelled) setArrivals(data.arrivals);
      } catch { /* silent — arrivals are optional enrichment */ }
    })();
    return () => { cancelled = true; };
  }, [stopId, locale]);
  return arrivals;
}

export function JourneyCard({ plan, locale }: { plan: JourneyPlan; locale: string }) {
  const t = useTranslations("transit");
  const firstTransit = plan.legs.find((l) => l.mode === "bus" || l.mode === "metro");
  const arrivals = useArrivals(firstTransit?.fromStopId, locale);
  const nextMin = arrivals?.find((a) => typeof a.minutes === "number")?.minutes;

  function label(mode: JourneyLeg["mode"]) {
    if (mode === "walk") return t("walk");
    if (mode === "bus") return t("bus");
    if (mode === "metro") return t("metro");
    return t("transfer");
  }

  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold" style={{ color: "var(--site-text)" }}>
          {plan.durationMin ? `${plan.durationMin} ${t("min")}` : ""}
        </p>
        {typeof nextMin === "number" && (
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ background: "rgba(8,145,178,0.15)", color: "#0891B2" }}
          >
            {t("nextArrival", { min: nextMin })}
          </span>
        )}
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {plan.legs.map((leg, i) => (
          <li key={i} className="flex items-center gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--site-bg-base)" }}
            >
              <LegIcon mode={leg.mode} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px]" style={{ color: "var(--site-text)" }}>
                {label(leg.mode)}
                {leg.line ? ` ${leg.line}` : ""}
                {leg.toStop ? ` → ${leg.toStop}` : ""}
              </p>
              {leg.durationMin ? (
                <p className="text-[12px]" style={{ color: "var(--site-text-50)" }}>
                  {leg.durationMin} {t("min")}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
