"use client";

import { useState } from "react";
import { Check, MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AIItinerary, PlacePreviewCard } from "@/types";

const CAT_EMOJI: Record<string, string> = {
  museum: "🏛️",
  sight: "🗼",
  cafe: "☕",
  restaurant: "🍽️",
  club: "🎵",
  park: "🌿",
  shop: "🛍️",
  wine: "🍷",
};

export function PlaceSelectionCards({
  places,
  pendingItinerary,
  pending,
  onConfirm,
}: {
  places: PlacePreviewCard[];
  pendingItinerary: AIItinerary;
  pending: boolean;
  onConfirm: (selectedIds: string[], filteredItinerary: AIItinerary) => void;
}) {
  const tc = useTranslations("chat");
  const tp = useTranslations("planner");
  const locale = useLocale();

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(places.map((p) => p.placeId)),
  );

  const days = [...new Set(places.map((p) => p.day))].sort((a, b) => a - b);
  const allSelected = selected.size === places.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(places.map((p) => p.placeId)));
  }

  function confirm() {
    const ids = [...selected];
    const filtered: AIItinerary = {
      title: pendingItinerary.title,
      days: pendingItinerary.days
        .map((d) => ({
          day: d.day,
          stops: d.stops.filter((s) => selected.has(s.place_id)),
        }))
        .filter((d) => d.stops.length > 0),
    };
    onConfirm(ids, filtered);
  }

  return (
    <div className="mt-2 w-full max-w-[520px] space-y-4 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tc("selectPlaces")}
        </p>
        <button
          onClick={toggleAll}
          className="text-xs text-primary hover:underline"
        >
          {allSelected ? tc("deselectAll") : tc("selectAll")}
        </button>
      </div>

      {days.map((day) => {
        const dayPlaces = places.filter((p) => p.day === day);
        return (
          <div key={day} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <span className="text-xs font-semibold">{tp("dayN", { n: day })}</span>
            </div>
            <div className="space-y-1.5">
              {dayPlaces.map((place) => {
                const isSelected = selected.has(place.placeId);
                const name =
                  locale === "ka" && place.nameKa ? place.nameKa : place.name;
                return (
                  <button
                    key={place.placeId}
                    onClick={() => toggle(place.placeId)}
                    className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border opacity-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/50"
                      }`}
                    >
                      {isSelected && (
                        <Check
                          className="size-2.5 text-primary-foreground"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt={name}
                        className="size-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-xl">
                        {CAT_EMOJI[place.category] ?? "📍"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {CAT_EMOJI[place.category] ?? "📍"} {place.category}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {place.rating.toFixed(1)}
                          {place.reviewCount > 0 && (
                            <span className="ml-0.5 text-muted-foreground/60">
                              ({place.reviewCount})
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {place.reason}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <Button
        onClick={confirm}
        disabled={selected.size === 0 || pending}
        className="w-full"
        size="sm"
      >
        {pending
          ? tc("building")
          : tc("confirmSelection", { count: selected.size })}
      </Button>
    </div>
  );
}
