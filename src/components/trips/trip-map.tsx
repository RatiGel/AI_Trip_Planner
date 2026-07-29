"use client";

import { useState } from "react";
import { ChevronDown, Map as MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { RouteMap } from "@/components/planner/route-map";
import {
  RouteModeToggle,
  TransitSummary,
  type RouteView,
} from "@/components/planner/route-mode-toggle";
import { useDayTransit } from "@/hooks/use-day-transit";
import { cn } from "@/lib/utils";
import type { RoutePlan } from "@/types";

/**
 * Map for a saved trip, collapsed by default — a trips page can hold several
 * cards and mounting a Mapbox/Leaflet instance per card up front is wasteful.
 * The Direct/TTC toggle mirrors the planner and chat views.
 */
export function TripMap({ plan }: { plan: RoutePlan }) {
  const t = useTranslations("trips");
  const tp = useTranslations("planner");
  const [open, setOpen] = useState(false);
  const [routeView, setRouteView] = useState<RouteView>("direct");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only fetch TTC routing once the map is actually visible in transit mode.
  const transit = useDayTransit(plan, open && routeView === "transit");
  const transitRoutes = routeView === "transit" ? transit.routes : null;

  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60 sm:px-6"
      >
        <MapIcon className="size-4 shrink-0 text-[var(--color-wine)] dark:text-[var(--color-gold)]" />
        <span className="flex-1 text-sm font-semibold">{t("viewOnMap")}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 px-5 pb-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {tp("routeView")}
            </span>
            <RouteModeToggle
              view={routeView}
              onChange={setRouteView}
              loading={transit.status === "loading"}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <div className="relative h-[360px]">
              <RouteMap
                plan={plan}
                transitRoutes={transitRoutes}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          {routeView === "transit" && (
            <TransitSummary
              routes={transit.routes}
              status={transit.status}
              onRetry={transit.retry}
            />
          )}
        </div>
      )}
    </div>
  );
}
