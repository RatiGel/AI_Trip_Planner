"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";

type T = ReturnType<typeof useTranslations<"transit">>;
import { Bus, Footprints, TramFront, ChevronDown, Dot } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { JourneyPlan, JourneyLeg, Arrival } from "@/types/transit";

/** ISO → locale HH:MM, or null when unavailable / unparseable. */
function clock(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Route brand color → readable on-chip text (white on dark, near-black on light). */
function onColor(hex: string): string {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111" : "#fff";
}

function ModeIcon({ mode, size = 15 }: { mode: JourneyLeg["mode"]; size?: number }) {
  const s = { width: size, height: size } as const;
  if (mode === "walk") return <Footprints style={{ ...s, color: "var(--site-text-50)" }} />;
  if (mode === "metro") return <TramFront style={{ ...s, color: "#7C3AED" }} />;
  if (mode === "bus") return <Bus style={{ ...s, color: "#0891B2" }} />;
  return <Dot style={{ ...s, color: "var(--site-text-40)" }} />;
}

/** Colored line pill (bus/metro) mirroring the map-app chips: 367, 1, 539. */
function LineChip({ leg }: { leg: JourneyLeg }) {
  const isMetro = leg.mode === "metro";
  const bg = leg.color ? `#${leg.color}` : isMetro ? "#7C3AED" : "#0891B2";
  const fg = leg.color ? onColor(leg.color) : "#fff";
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5">
      <ModeIcon mode={leg.mode} size={13} />
      <span
        className="rounded px-1.5 py-0.5 text-[12px] font-bold leading-none tabular-nums"
        style={{ background: bg, color: fg }}
      >
        {leg.line ?? (isMetro ? "M" : "•")}
      </span>
    </span>
  );
}

/** Compact one-line summary of the trip, like the map-app row. */
function LegStrip({ legs, t }: { legs: JourneyLeg[]; t: T }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {legs.map((leg, i) => {
        const chip =
          leg.mode === "walk" ? (
            <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--site-text-60)" }}>
              <Footprints className="size-3.5" />
              {typeof leg.durationMin === "number" ? t("minShort", { min: leg.durationMin }) : t("walk")}
            </span>
          ) : (
            <LineChip leg={leg} />
          );
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {chip}
            {i < legs.length - 1 && (
              <span aria-hidden style={{ color: "var(--site-text-35)" }} className="text-[13px]">
                ›
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
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

export function JourneyCard({
  plan,
  locale,
  selected,
  onSelect,
}: {
  plan: JourneyPlan;
  locale: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const t = useTranslations("transit");
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  const firstTransit = plan.legs.find(
    (l) => (l.mode === "bus" || l.mode === "metro") && l.fromStopId
  );
  const boardStop = firstTransit?.fromStop ?? plan.legs.find((l) => l.fromStop)?.fromStop;
  const arrivals = useArrivals(firstTransit?.fromStopId, locale);
  const nextMin = arrivals?.find((a) => typeof a.minutes === "number")?.minutes;

  const depart = useMemo(() => clock(plan.startTime, locale), [plan.startTime, locale]);
  const arrive = useMemo(() => clock(plan.endTime, locale), [plan.endTime, locale]);
  const hasClock = depart && arrive;

  function label(mode: JourneyLeg["mode"]) {
    if (mode === "walk") return t("walk");
    if (mode === "bus") return t("bus");
    if (mode === "metro") return t("metro");
    return t("transfer");
  }

  return (
    <motion.div
      className="overflow-hidden rounded-2xl transition-shadow"
      style={{
        background: "var(--site-bg-elevated)",
        border: `1px solid ${selected ? "#0891B2" : "var(--site-border-06)"}`,
        boxShadow: selected ? "0 0 0 1px #0891B2, 0 8px 24px rgba(8,145,178,0.15)" : "none",
      }}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={() => { onSelect?.(); setOpen((v) => !v); }}
        aria-expanded={open}
        className="block w-full cursor-pointer p-5 text-left transition-colors"
        style={{ background: "transparent" }}
      >
        {/* Depart · Duration · Arrive */}
        {hasClock ? (
          <div className="flex items-baseline justify-between gap-3">
            <Endpoint labelText={t("depart")} time={depart!} align="left" />
            <div className="flex flex-col items-center">
              <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--site-text-40)" }}>
                {t("duration")}
              </span>
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--site-text)" }}>
                {plan.durationMin ? t("minShort", { min: plan.durationMin }) : "—"}
              </span>
            </div>
            <Endpoint labelText={t("arrive")} time={arrive!} align="right" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--site-text)" }}>
              {plan.durationMin ? t("minShort", { min: plan.durationMin }) : t("routeFound")}
            </span>
            {typeof plan.walkMin === "number" && plan.walkMin > 0 && (
              <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--site-text-50)" }}>
                <Footprints className="size-3.5" /> {t("minShort", { min: plan.walkMin })}
              </span>
            )}
          </div>
        )}

        {/* Compact leg strip */}
        <div className="mt-3">
          <LegStrip legs={plan.legs} t={t} />
        </div>

        {/* Footer: boarding stop + live badge + expand affordance */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[13px]" style={{ color: "var(--site-text-50)" }}>
            {boardStop ? t("departingFrom", { stop: boardStop }) : " "}
          </span>
          <span className="flex items-center gap-2">
            {typeof nextMin === "number" && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums"
                style={{ background: "rgba(8,145,178,0.15)", color: "#22b8d9" }}
              >
                <span className="inline-block size-1.5 rounded-full" style={{ background: "#22b8d9" }} />
                {t("nextArrival", { min: nextMin })}
              </span>
            )}
            <ChevronDown
              className="size-4 shrink-0 transition-transform duration-200"
              style={{ color: "var(--site-text-40)", transform: open ? "rotate(180deg)" : "none" }}
            />
          </span>
        </div>
      </button>

      {/* Expanded step-by-step timeline */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "var(--site-border-06)" }}>
              <ol className="flex flex-col gap-3">
                {plan.legs.map((leg, i) => {
                  const legTime = clock(leg.startTime, locale);
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "var(--site-bg-base)" }}
                      >
                        <ModeIcon mode={leg.mode} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px]" style={{ color: "var(--site-text)" }}>
                          {label(leg.mode)}
                          {leg.line ? ` ${leg.line}` : ""}
                          {leg.toStop ? ` → ${leg.toStop}` : ""}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--site-text-50)" }}>
                          {legTime ? `${legTime} · ` : ""}
                          {typeof leg.durationMin === "number" ? t("minShort", { min: leg.durationMin }) : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Endpoint({ labelText, time, align }: { labelText: string; time: string; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end" : "items-start"}`}>
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--site-text-40)" }}>
        {labelText}
      </span>
      <span className="text-[18px] font-bold tabular-nums leading-tight" style={{ color: "var(--site-text)" }}>
        {time}
      </span>
    </div>
  );
}
