"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { MapPin, Crosshair, ListFilter } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mockPlaces } from "@/lib/mock/places";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug, Place } from "@/types";

const CITY_BOUNDS = {
  // Loose bounding box around Tbilisi center for the mock map projection.
  minLng: 44.76,
  maxLng: 44.83,
  minLat: 41.68,
  maxLat: 41.73,
};

function project(place: Place) {
  const x =
    ((place.geo.lng - CITY_BOUNDS.minLng) / (CITY_BOUNDS.maxLng - CITY_BOUNDS.minLng)) * 100;
  const y =
    100 -
    ((place.geo.lat - CITY_BOUNDS.minLat) / (CITY_BOUNDS.maxLat - CITY_BOUNDS.minLat)) * 100;
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

export function MapPlaceholder() {
  const t = useTranslations("map");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const [active, setActive] = useState<Set<CategorySlug>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const places = useMemo(
    () =>
      active.size === 0
        ? mockPlaces.filter((p) => p.citySlug === "tbilisi")
        : mockPlaces.filter(
            (p) =>
              p.citySlug === "tbilisi" && p.categories.some((c) => active.has(c)),
          ),
    [active],
  );

  function toggle(c: CategorySlug) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const selectedPlace = places.find((p) => p.id === selected) ?? places[0];
  const selectedName = selectedPlace
    ? locale === "ka"
      ? selectedPlace.nameKa
      : selectedPlace.name
    : "";

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr] md:grid-cols-[320px_1fr] md:grid-rows-1">
      <aside className="hidden md:flex flex-col border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="text-sm font-medium">{t("filters")}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Button variant="outline" className="w-full" size="sm">
            <Crosshair className="size-4" /> {t("nearMe")}
          </Button>
          <div className="space-y-2">
            {mockCategories.map((c) => (
              <label
                key={c.slug}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent"
              >
                <Checkbox
                  checked={active.has(c.slug)}
                  onCheckedChange={() => toggle(c.slug)}
                />
                <span className="text-sm">{tCat(c.slug)}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="md:hidden flex items-center gap-2 border-b border-border bg-card p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <ListFilter className="size-4" /> {t("filters")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>{t("filters")}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pt-2 space-y-2">
              {mockCategories.map((c) => (
                <label key={c.slug} className="flex items-center gap-2 rounded-md p-2 hover:bg-accent">
                  <Checkbox checked={active.has(c.slug)} onCheckedChange={() => toggle(c.slug)} />
                  <span className="text-sm">{tCat(c.slug)}</span>
                </label>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <Button size="sm" variant="outline">
          <Crosshair className="size-4" /> {t("nearMe")}
        </Button>
      </div>

      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#dbeafe,transparent_60%),radial-gradient(circle_at_80%_70%,#ddd6fe,transparent_55%),#f8fafc]">
        <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
        <div className="absolute inset-0 p-4">
          {places.map((p) => {
            const { x, y } = project(p);
            const isSelected = selectedPlace?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="group absolute -translate-x-1/2 -translate-y-full"
                aria-label={p.name}
              >
                <span
                  className={`relative inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs font-medium shadow-sm transition ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  <MapPin className="size-3.5 text-primary" />
                  <span className="max-w-32 truncate">
                    {locale === "ka" ? p.nameKa : p.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {selectedPlace && (
          <div className="absolute inset-x-3 bottom-3 md:left-auto md:right-4 md:bottom-4 md:max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {selectedPlace.images[0] && (
                  <Image
                    src={selectedPlace.images[0]}
                    alt={selectedName}
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="font-semibold">{selectedName}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedPlace.categories.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {tCat(c)}
                    </Badge>
                  ))}
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/places/${selectedPlace.slug}`}>
                    {t("showList")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .grid-bg {
          background-image: linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
