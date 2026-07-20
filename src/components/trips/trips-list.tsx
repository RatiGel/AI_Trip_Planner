"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavedItinerary, Place } from "@/types";

export function TripsList({
  trips: initial,
  placesMap,
}: {
  trips: SavedItinerary[];
  placesMap: Record<string, Place>;
}) {
  const [trips, setTrips] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const t = useTranslations("trips");
  const locale = useLocale();
  const router = useRouter();

  async function deleteTrip(id: string, title: string) {
    if (!confirm(t("deleteConfirm", { title }))) return;
    setDeleting(id);
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      toast.success(t("deleted"));
    } else {
      toast.error(t("deleteFailed"));
    }
  }

  return (
    <div className="space-y-6">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          placesMap={placesMap}
          locale={locale}
          deleting={deleting === trip.id}
          onEdit={() =>
            router.push(`/trips/${trip.id}/edit` as Parameters<typeof router.push>[0])
          }
          onDelete={() => deleteTrip(trip.id, trip.title)}
        />
      ))}
    </div>
  );
}

function TripCard({
  trip,
  placesMap,
  locale,
  deleting,
  onEdit,
  onDelete,
}: {
  trip: SavedItinerary;
  placesMap: Record<string, Place>;
  locale: string;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("trips");
  // First day expanded by default; the rest collapsed.
  const firstKey = useMemo(
    () => trip.days[0]?._id ?? "idx-0",
    [trip.days]
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set([firstKey]));

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <article className="group/card overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Header — brand-tinted, sits above the day timeline */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-gradient-to-r from-[var(--color-wine)]/[0.06] to-transparent px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display truncate text-2xl leading-tight tracking-[-0.3px]">
            {trip.title}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{t("saved", { date: trip.createdAt })}</span>
            <span aria-hidden className="text-border">•</span>
            <span className="font-medium text-foreground/70">
              {t("days", { count: trip.days.length })}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-9 rounded-full text-muted-foreground hover:text-foreground"
            title={t("edit")}
            aria-label={t("edit")}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={t("delete")}
            aria-label={t("delete")}
            disabled={deleting}
            className="size-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Signature: the trip spine — a wine→gold rail threading numbered day nodes */}
      <div className="relative px-5 py-2 sm:px-6">
        <div
          aria-hidden
          className="absolute bottom-6 left-[calc(1.25rem+1.125rem)] top-6 w-px bg-gradient-to-b from-[var(--color-wine)] via-[var(--color-gold)] to-[var(--color-gold)]/30 sm:left-[calc(1.5rem+1.125rem)]"
        />
        <ul className="space-y-1">
          {trip.days.map((day, dayIndex) => {
            const dayKey = day._id ?? `idx-${dayIndex}`;
            const isOpen = open.has(dayKey);
            const count = day.items.length;
            return (
              <li key={dayKey} className="relative">
                <button
                  type="button"
                  onClick={() => toggle(dayKey)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 rounded-xl py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Day node on the rail */}
                  <span
                    className={cn(
                      "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm tabular-nums transition-colors",
                      isOpen
                        ? "border-transparent bg-[var(--color-wine)] text-white shadow-sm"
                        : "border-border bg-card text-muted-foreground group-hover/card:border-[var(--color-wine)]/40"
                    )}
                  >
                    {dayIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t("day", { n: dayIndex + 1 })}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {day.date} · {t("stops", { count })}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-[calc(2.25rem+1rem)] overflow-hidden pb-2 pt-1 duration-200 animate-in fade-in slide-in-from-top-1">
                    {count === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">{t("emptyDay")}</p>
                    ) : (
                      <ol className="space-y-2.5">
                        {day.items.map((item, itemIndex) => {
                          const place = placesMap[item.placeId];
                          if (!place) return null;
                          const name = locale === "ka" ? place.nameKa : place.name;
                          const itemKey = item._id ?? `idx-${itemIndex}`;
                          return (
                            <li
                              key={itemKey}
                              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 transition-colors hover:border-[var(--color-gold)]/50 hover:bg-muted/40"
                            >
                              <span className="mt-0.5 flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                                <Clock className="size-3" />
                                {item.time}
                              </span>
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/places/${place.slug}`}
                                  className="flex items-center gap-1 text-sm font-medium hover:text-[var(--color-wine)] hover:underline dark:hover:text-[var(--color-gold)]"
                                >
                                  <MapPin className="size-3.5 shrink-0 text-[var(--color-wine)] dark:text-[var(--color-gold)]" />
                                  <span className="truncate">{name}</span>
                                </Link>
                                {item.notes && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
