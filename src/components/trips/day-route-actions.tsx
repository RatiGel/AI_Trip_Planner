"use client";

import { Bus, ExternalLink, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RouteDay } from "@/types";
import { dayMapUrl } from "@/lib/google-maps";

/**
 * Per-day export row on a saved trip: open the day in Google Maps, or jump to
 * the city-transport page which draws the whole trip on TTC bus/metro routes.
 */
export function DayRouteActions({ day, tripId }: { day: RouteDay; tripId: string }) {
  const t = useTranslations("trips");

  const googleUrl = dayMapUrl(day, "walking");

  if (day.stops.length < 2) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <TriangleAlert className="size-3" />
        {t("routeNeedsTwoStops")}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {googleUrl && (
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-gold)]/60 hover:shadow-sm"
        >
          <ExternalLink className="size-3.5 text-[var(--color-gold)]" />
          {t("openInGoogleMaps")}
        </a>
      )}
      <Link
        href={`/trips/${tripId}/transit`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0891B2]/60 hover:shadow-sm"
      >
        <Bus className="size-3.5 text-[#0891B2]" />
        {t("openInCityTransport")}
      </Link>
    </div>
  );
}
