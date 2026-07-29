"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { RoutePlan } from "@/types";
import type { DayTransitRoute } from "@/types/transit";

export type TransitStatus = "idle" | "loading" | "ready" | "error";

/**
 * Fetches TTC routing for every day of a RoutePlan, once per plan, and only
 * when `enabled` (i.e. the user actually switched to the transit view). The
 * result is cached for the lifetime of the plan so toggling back and forth
 * doesn't re-hit the API.
 */
export function useDayTransit(plan: RoutePlan | null, enabled: boolean) {
  const locale = useLocale();
  const [routes, setRoutes] = useState<DayTransitRoute[] | null>(null);
  const [status, setStatus] = useState<TransitStatus>("idle");
  // Identifies the plan+locale the cached routes belong to.
  const cacheKeyRef = useRef<string | null>(null);

  const planKey = plan
    ? `${locale}|${plan.title}|${plan.days
        .map((d) => `${d.day}:${d.stops.map((s) => s.place.id).join(",")}`)
        .join(";")}`
    : null;

  const fetchRoutes = useCallback(async () => {
    if (!plan || !planKey) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/transit/day-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          days: plan.days.map((d) => ({
            day: d.day,
            color: d.color,
            stops: d.stops.map((s) => ({
              name: locale === "ka" ? s.place.nameKa || s.place.name : s.place.name,
              lat: s.place.geo.lat,
              lng: s.place.geo.lng,
            })),
          })),
        }),
      });
      if (!res.ok) throw new Error(`day_route_${res.status}`);
      const data = (await res.json()) as { routes: DayTransitRoute[] };
      cacheKeyRef.current = planKey;
      setRoutes(data.routes);
      setStatus(data.routes.length > 0 ? "ready" : "error");
    } catch {
      cacheKeyRef.current = null;
      setRoutes(null);
      setStatus("error");
    }
  }, [plan, planKey, locale]);

  useEffect(() => {
    if (!enabled || !plan) return;
    if (cacheKeyRef.current === planKey) return;
    fetchRoutes();
  }, [enabled, plan, planKey, fetchRoutes]);

  // A new plan invalidates the cache immediately, even while disabled.
  useEffect(() => {
    if (cacheKeyRef.current !== null && cacheKeyRef.current !== planKey) {
      cacheKeyRef.current = null;
      setRoutes(null);
      setStatus("idle");
    }
  }, [planKey]);

  return { routes, status, retry: fetchRoutes };
}
