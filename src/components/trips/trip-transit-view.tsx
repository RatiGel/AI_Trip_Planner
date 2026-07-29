"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Bus, Footprints, MapPin, TramFront, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RouteMap } from "@/components/planner/route-map";
import { cn } from "@/lib/utils";
import type { RouteDay, RoutePlan } from "@/types";
import type { DayTransitRoute, JourneyLeg } from "@/types/transit";

/** Route brand color → readable on-chip text. */
function onColor(hex: string): string {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}

/** Colored line number pill — the thing a rider actually looks for. */
function LineChip({ leg, big = false }: { leg: JourneyLeg; big?: boolean }) {
  const isMetro = leg.mode === "metro";
  const bg = leg.color ? `#${leg.color}` : isMetro ? "#7C3AED" : "#0891B2";
  const fg = leg.color ? onColor(leg.color) : "#fff";
  const Icon = isMetro ? TramFront : Bus;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={big ? "size-4" : "size-3.5"} style={{ color: bg }} />
      <span
        className={cn(
          "rounded font-bold leading-none tabular-nums",
          big ? "px-2 py-1 text-sm" : "px-1.5 py-0.5 text-xs",
        )}
        style={{ background: bg, color: fg }}
      >
        {leg.line ?? (isMetro ? "M" : "•")}
      </span>
    </span>
  );
}

/** One transit leg: which line to board, where to get on, where to get off. */
function LegRow({ leg }: { leg: JourneyLeg }) {
  const t = useTranslations("trips");

  if (leg.mode === "walk") {
    return (
      <li className="flex items-center gap-3 py-2 pl-1 text-sm text-muted-foreground">
        <Footprints className="size-4 shrink-0 opacity-70" />
        <span>{t("walkMin", { min: leg.durationMin ?? 0 })}</span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="shrink-0 pt-0.5">
        <LineChip leg={leg} big />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {leg.fromStop ?? "—"}
          <span className="mx-1.5 text-muted-foreground">→</span>
          {leg.toStop ?? "—"}
        </p>
        {typeof leg.durationMin === "number" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("rideMin", { min: leg.durationMin })}
          </p>
        )}
      </div>
    </li>
  );
}

/** Every hop of one day: stop → how to get to the next stop → stop. */
function DayPanel({
  day,
  date,
  route,
  onSelect,
}: {
  day: RouteDay;
  date: string | undefined;
  route: DayTransitRoute | undefined;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("trips");

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/70 px-4 py-3">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: day.color }} />
        <h2 className="text-sm font-semibold">{t("day", { n: day.day })}</h2>
        {date && <span className="text-xs text-muted-foreground">{date}</span>}
        {route && (
          <span className="text-xs text-muted-foreground">
            · {t("transitTotal", { min: route.totalMin })}
            {route.transitLegs > 0 && ` · ${t("rides", { n: route.transitLegs })}`}
          </span>
        )}
      </header>

      <ol className="px-4 py-2">
        {day.stops.map((stop, i) => {
          const seg = route?.segments.find((s) => s.fromIndex === i);
          return (
            <li key={stop.place.id}>
              {/* The stop itself */}
              <button
                type="button"
                onClick={() => onSelect(stop.place.id)}
                className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-muted/60"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: day.color }}
                >
                  {stop.order}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {stop.place.name}
                </span>
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              </button>

              {/* How to reach the next stop */}
              {seg && (
                <div className="my-1 ml-3.5 border-l-2 border-dashed border-border pl-5">
                  {seg.journey ? (
                    <ul className="divide-y divide-border/50">
                      {seg.journey.legs.map((leg, li) => (
                        <LegRow key={li} leg={leg} />
                      ))}
                    </ul>
                  ) : (
                    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Footprints className="size-4 shrink-0 opacity-70" />
                      {t("walkNoTransit", { min: seg.fallbackWalkMin ?? 0 })}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Full-page city-transport view of a saved trip: the whole route drawn with
 * real TTC geometry, plus the stops and line numbers for each hop. Departure
 * times are deliberately omitted — the saved trip has no fixed departure, so
 * only the ride structure is meaningful.
 */
export function TripTransitView({
  title,
  plan,
  routes,
  dates = [],
}: {
  title: string;
  plan: RoutePlan | null;
  routes: DayTransitRoute[];
  /** Saved date per day, index-aligned with plan.days. */
  dates?: string[];
}) {
  const t = useTranslations("trips");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const routeByDay = useMemo(
    () => new Map(routes.map((r) => [r.day, r])),
    [routes],
  );

  const hasAnyRide = routes.some((r) => r.transitLegs > 0);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("backToTrips")}
      </Link>

      <header className="mt-4 mb-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#0891B2]">
          <Bus className="size-3.5" />
          {t("cityTransportRoute")}
        </p>
        <h1 className="font-display mt-1 text-3xl leading-tight tracking-[-0.5px] md:text-4xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("transitPageHint")}</p>
      </header>

      {!plan ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("transitNoStops")}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)]">
            <div className="relative h-[380px] lg:h-full">
              <RouteMap
                plan={plan}
                transitRoutes={routes}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          <div className="space-y-4">
            {!hasAnyRide && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {t("transitAllWalkable")}
              </p>
            )}
            {plan.days.map((day, i) => (
              <DayPanel
                key={day.day}
                day={day}
                date={dates[i]}
                route={routeByDay.get(day.day)}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
