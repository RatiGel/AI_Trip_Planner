"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
    <div className="mt-6 space-y-6">
      {trips.map((trip) => (
        <article key={trip.id} className="rounded-2xl border border-border bg-card p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{trip.title}</h2>
              <p className="text-xs text-muted-foreground">{trip.createdAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{trip.days.length} days</Badge>
              <Button
                size="icon"
                variant="ghost"
                title={t("edit")}
                onClick={() => router.push(`/trips/${trip.id}/edit` as Parameters<typeof router.push>[0])}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={t("delete")}
                disabled={deleting === trip.id}
                className="text-destructive hover:text-destructive"
                onClick={() => deleteTrip(trip.id, trip.title)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </header>

          <Accordion className="mt-4">
            {trip.days.map((day) => (
              <AccordionItem key={day.date} value={day.date}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    {day.date}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {day.items.map((item) => {
                      const place = placesMap[item.placeId];
                      if (!place) return null;
                      const name = locale === "ka" ? place.nameKa : place.name;
                      return (
                        <li key={`${item.placeId}-${item.time}`} className="flex items-start gap-3">
                          <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">
                            {item.time}
                          </span>
                          <div className="flex-1">
                            <Link
                              href={`/places/${place.slug}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {name}
                            </Link>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </article>
      ))}
    </div>
  );
}
