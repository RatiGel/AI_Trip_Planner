"use client";

import { useState } from "react";
import { Map as MapIcon, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PreferencesForm } from "./preferences-form";
import { ItinerarySidebar } from "./itinerary-sidebar";
import { RouteMap } from "./route-map";
import type { RoutePlan, TravelPreferences } from "@/types";

export function PlannerView() {
  const t = useTranslations("planner");
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function generate(prefs: TravelPreferences) {
    setPending(true);
    setSelectedId(null);
    try {
      const res = await fetch("/api/route-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("error"));
        return;
      }
      setPlan(data.plan as RoutePlan);
      setIsMock(!!data.mock);
    } catch {
      toast.error(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_380px]">
      {/* Left: preferences */}
      <aside className="overflow-y-auto border-b border-border bg-card p-4 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{t("subtitle")}</p>
        <PreferencesForm pending={pending} onSubmit={generate} />
      </aside>

      {/* Center: map */}
      <div className="relative min-h-[320px] bg-muted">
        {plan ? (
          <RouteMap
            plan={plan}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <MapIcon className="size-10 opacity-40" />
            <p className="max-w-xs text-sm">{t("emptyMap")}</p>
          </div>
        )}
      </div>

      {/* Right: itinerary (below map on md, beside on lg) */}
      {plan && (
        <aside className="overflow-hidden border-t border-border bg-card md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:border-l lg:border-t-0">
          {isMock && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
              Preview mode — add <code className="font-mono">ANTHROPIC_API_KEY</code> for real AI planning
            </div>
          )}
          <ItinerarySidebar
            plan={plan}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
      )}
    </div>
  );
}
