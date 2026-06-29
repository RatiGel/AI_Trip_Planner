"use client";

import { useState } from "react";
import { Check, MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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

// Warm tinted backgrounds per category for the image-fallback tile.
const CAT_TINT: Record<string, string> = {
  museum: "from-amber-100 to-orange-200 text-amber-700",
  sight: "from-rose-100 to-orange-200 text-rose-700",
  cafe: "from-amber-100 to-yellow-200 text-amber-800",
  restaurant: "from-orange-100 to-red-200 text-orange-700",
  club: "from-violet-100 to-fuchsia-200 text-violet-700",
  park: "from-emerald-100 to-green-200 text-emerald-700",
  shop: "from-sky-100 to-blue-200 text-sky-700",
  wine: "from-rose-100 to-red-200 text-rose-800",
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
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

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
    <div className="chat-rise mt-2 w-full max-w-[540px] overflow-hidden rounded-2xl border border-[#E8A020]/25 bg-card shadow-[0_8px_30px_-12px_rgba(181,39,29,0.18)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-[#FFF7ED] to-[#FDF2F0] px-4 py-3 dark:from-[#2a1a10]/40 dark:to-[#2a1212]/40">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm">
            <MapPin className="size-3.5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {tc("selectPlaces")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {selected.size}/{places.length}
            </p>
          </div>
        </div>
        <button
          onClick={toggleAll}
          className="cursor-pointer rounded-full border border-[#E8A020]/40 px-3 py-1 text-xs font-medium text-[#B5271D] transition-colors hover:bg-[#E8A020]/10 dark:text-[#F5C842]"
        >
          {allSelected ? tc("deselectAll") : tc("selectAll")}
        </button>
      </div>

      <div className="space-y-5 p-4">
        {days.map((day) => {
          const dayPlaces = places.filter((p) => p.day === day);
          return (
            <div key={day} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-[10px] font-bold text-white">
                  {day}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tp("dayN", { n: day })}
                </span>
                <span className="h-px flex-1 bg-border/70" />
              </div>

              <div className="space-y-2">
                {dayPlaces.map((place) => {
                  const isSelected = selected.has(place.placeId);
                  const name =
                    locale === "ka" && place.nameKa ? place.nameKa : place.name;
                  const showImg = place.imageUrl && !broken.has(place.placeId);
                  return (
                    <button
                      key={place.placeId}
                      onClick={() => toggle(place.placeId)}
                      aria-pressed={isSelected}
                      className={`group flex w-full cursor-pointer items-stretch gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-[#E8A020]/60 bg-[#E8A020]/[0.06] shadow-sm"
                          : "border-border bg-background opacity-60 hover:opacity-90"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                        {showImg ? (
                          <img
                            src={place.imageUrl}
                            alt={name}
                            onError={() =>
                              setBroken((b) => new Set(b).add(place.placeId))
                            }
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className={`flex size-full items-center justify-center bg-gradient-to-br text-2xl ${
                              CAT_TINT[place.category] ?? "from-stone-100 to-stone-200 text-stone-600"
                            }`}
                          >
                            {CAT_EMOJI[place.category] ?? "📍"}
                          </div>
                        )}
                        {/* Selected check overlay */}
                        <div
                          className={`absolute right-1 top-1 flex size-4 items-center justify-center rounded-full transition-all duration-200 ${
                            isSelected
                              ? "scale-100 bg-[#B5271D] opacity-100"
                              : "scale-50 opacity-0"
                          }`}
                        >
                          <Check className="size-2.5 text-white" strokeWidth={3.5} />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="truncate text-sm font-semibold leading-snug text-foreground">
                          {name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                            {place.category}
                          </span>
                          {place.rating > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground/70">
                              <Star className="size-3 fill-[#E8A020] text-[#E8A020]" />
                              {place.rating.toFixed(1)}
                              {place.reviewCount > 0 && (
                                <span className="font-normal text-muted-foreground/70">
                                  ({place.reviewCount})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {place.reason && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {place.reason}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm CTA */}
      <div className="border-t border-border/60 p-3">
        <button
          onClick={confirm}
          disabled={selected.size === 0 || pending}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8A020] to-[#B5271D] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md"
        >
          {pending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {tc("building")}
            </>
          ) : (
            tc("confirmSelection", { count: selected.size })
          )}
        </button>
      </div>
    </div>
  );
}
