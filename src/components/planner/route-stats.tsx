"use client";

import { MapPin, Footprints, Clock, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RouteStats } from "@/types";

export function fmtDistance(meters: number): string {
  return meters < 1000
    ? `${meters} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Compact stats bar shown under the itinerary header. */
export function RouteStatsBar({ stats }: { stats: RouteStats }) {
  const t = useTranslations("planner");
  const items = [
    { icon: MapPin, label: t("stops"), value: String(stats.stopCount) },
    { icon: Footprints, label: t("distance"), value: fmtDistance(stats.totalDistanceMeters) },
    { icon: Clock, label: t("travel"), value: fmtDuration(stats.totalTravelMin) },
    { icon: Flag, label: t("endsAt"), value: stats.dayEndsAt },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-border bg-background p-2"
        >
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Icon className="size-3" />
            {label}
          </div>
          <div className="mt-0.5 text-sm font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
