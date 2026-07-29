"use client";

import { Bus, Footprints, Route, TramFront, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DayTransitRoute, DayTransitSegment, JourneyLeg } from "@/types/transit";
import type { TransitStatus } from "@/hooks/use-day-transit";

export type RouteView = "direct" | "transit";

/** Route brand color → readable on-chip text (white on dark, near-black on light). */
function onColor(hex: string): string {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111" : "#fff";
}

function LineChip({ leg }: { leg: JourneyLeg }) {
  const isMetro = leg.mode === "metro";
  const bg = leg.color ? `#${leg.color}` : isMetro ? "#7C3AED" : "#0891B2";
  const fg = leg.color ? onColor(leg.color) : "#fff";
  const Icon = isMetro ? TramFront : Bus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" style={{ color: bg }} />
      <span
        className="rounded px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums"
        style={{ background: bg, color: fg }}
      >
        {leg.line ?? (isMetro ? "M" : "•")}
      </span>
    </span>
  );
}

/** Segmented Direct / TTC switch. */
export function RouteModeToggle({
  view,
  onChange,
  loading,
}: {
  view: RouteView;
  onChange: (v: RouteView) => void;
  loading?: boolean;
}) {
  const t = useTranslations("planner");
  const options: { key: RouteView; label: string }[] = [
    { key: "direct", label: t("viewDirect") },
    { key: "transit", label: t("viewTransit") },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("routeView")}
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5"
    >
      {options.map((o) => {
        const active = o.key === view;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.key === "direct" ? <Route className="size-3.5" /> : <Bus className="size-3.5" />}
            {o.label}
            {o.key === "transit" && loading && active && (
              <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** One hop: either its TTC legs, or the dashed walk fallback. */
function SegmentRow({ seg }: { seg: DayTransitSegment }) {
  const t = useTranslations("planner");
  const tt = useTranslations("transit");

  if (!seg.journey) {
    return (
      <div className="flex items-start gap-2 py-1 text-[12px] text-muted-foreground">
        <Footprints className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        <span>
          {t("walkFallback", { min: seg.fallbackWalkMin ?? 0 })}
          <span className="ml-1 opacity-70">· {seg.fromName} → {seg.toName}</span>
        </span>
      </div>
    );
  }

  const legs = seg.journey.legs;

  // TTC answered, but with no bus/metro — there are no line chips to show, so
  // present it like a walk rather than a bare duration.
  if (!legs.some((l) => l.mode === "bus" || l.mode === "metro")) {
    return (
      <div className="flex items-start gap-2 py-1 text-[12px] text-muted-foreground">
        <Footprints className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        <span>
          {t("walkOnly", { min: seg.journey.durationMin ?? 0 })}
          <span className="ml-1 opacity-70">· {seg.fromName} → {seg.toName}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-1 text-[12px]">
      <div className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
        {legs.map((leg, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {leg.mode === "walk" ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Footprints className="size-3.5" />
                {tt("minShort", { min: leg.durationMin ?? 0 })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <LineChip leg={leg} />
                {leg.fromStop && (
                  <span className="max-w-[10rem] truncate text-muted-foreground">{leg.fromStop}</span>
                )}
              </span>
            )}
            {i < legs.length - 1 && <span aria-hidden className="opacity-40">›</span>}
          </span>
        ))}
      </div>
      {typeof seg.journey.durationMin === "number" && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {tt("minShort", { min: seg.journey.durationMin })}
        </span>
      )}
    </div>
  );
}

/**
 * Per-day TTC breakdown shown under the map in the transit view: total time,
 * boardings, and every hop between consecutive itinerary stops.
 */
export function TransitSummary({
  routes,
  status,
  onRetry,
}: {
  routes: DayTransitRoute[] | null;
  status: TransitStatus;
  onRetry: () => void;
}) {
  const t = useTranslations("planner");

  if (status === "loading" && !routes) {
    return (
      <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
        {t("transitLoading")}
      </p>
    );
  }

  if (status === "error" || !routes || routes.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="flex items-center gap-1.5">
          <TriangleAlert className="size-3.5" />
          {t("transitUnavailable")}
        </span>
        <button onClick={onRetry} className="cursor-pointer font-semibold underline underline-offset-2">
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {routes.map((route) => (
        <div key={route.day} className="rounded-xl border border-border bg-background/60 p-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
            <span className="size-2 shrink-0 rounded-full" style={{ background: route.color }} />
            {t("dayN", { n: route.day })}
            <span className="font-normal text-muted-foreground">
              · {t("transitTotal", { min: route.totalMin })}
              {route.transitLegs > 0 && ` · ${t("boardings", { n: route.transitLegs })}`}
              {route.totalWalkMin > 0 && ` · ${t("walkTotal", { min: route.totalWalkMin })}`}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {route.segments.map((seg) => (
              <SegmentRow key={seg.fromIndex} seg={seg} />
            ))}
          </div>
          {route.gapCount > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TriangleAlert className="size-3" />
              {t("transitGaps", { n: route.gapCount })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
