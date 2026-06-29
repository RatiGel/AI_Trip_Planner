"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RouteStatsBar, fmtDistance, fmtDuration } from "./route-stats";
import type { RoutePlan } from "@/types";

export function ItinerarySidebar({
  plan,
  selectedId,
  onSelect,
}: {
  plan: RoutePlan;
  selectedId: string | null;
  onSelect: (placeId: string) => void;
}) {
  const t = useTranslations("planner");
  const locale = useLocale();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-gradient-to-r from-[#FFF7ED]/60 to-transparent p-4 dark:from-[#2a1a10]/30">
        <h2 className="font-display text-lg tracking-tight">{plan.title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("totalOverview", {
            days: plan.days.length,
            distance: fmtDistance(plan.totals.totalDistanceMeters),
            time: fmtDuration(plan.totals.totalTravelMin + plan.totals.totalVisitMin),
          })}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {plan.days.map((day) => (
          <section key={day.day} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ background: day.color }}
              />
              <h3 className="text-sm font-semibold">
                {t("dayN", { n: day.day })}
              </h3>
            </div>

            <RouteStatsBar stats={day.stats} />

            <ol className="space-y-2">
              {day.stops.map((stop) => {
                const isSelected = selectedId === stop.place.id;
                const name =
                  locale === "ka" ? stop.place.nameKa : stop.place.name;
                return (
                  <li key={`${day.day}-${stop.place.id}`}>
                    <button
                      onClick={() => onSelect(stop.place.id)}
                      className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-[#E8A020]/60 bg-[#E8A020]/[0.06] ring-2 ring-[#E8A020]/25"
                          : "border-border hover:-translate-y-0.5 hover:border-[#E8A020]/40 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: day.color }}
                        >
                          {stop.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {name}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {stop.reason}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {stop.arrival}–{stop.departure}
                            </span>
                            {stop.travelFromPrevMin > 0 && (
                              <span>
                                +{fmtDuration(stop.travelFromPrevMin)} {t("travelLeg")}
                              </span>
                            )}
                            {stop.closedWarning && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="size-3" />
                                {t("mayBeClosed")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
