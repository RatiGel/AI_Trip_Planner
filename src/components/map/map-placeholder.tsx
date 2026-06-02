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

const TBILISI_DEFAULT = "https://maps.google.com/maps?q=41.6938,44.8015&z=13&output=embed";

function embedUrl(place: Place) {
  return `https://maps.google.com/maps?q=${place.geo.lat},${place.geo.lng}&z=17&output=embed`;
}

function FilterPanel({
  active,
  toggle,
}: {
  active: Set<CategorySlug>;
  toggle: (c: CategorySlug) => void;
}) {
  const tCat = useTranslations("categories");
  const t = useTranslations("map");
  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full" size="sm">
        <Crosshair className="size-4" /> {t("nearMe")}
      </Button>
      <div className="space-y-2">
        {mockCategories.map((c) => (
          <label
            key={c.slug}
            className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent"
          >
            <Checkbox checked={active.has(c.slug)} onCheckedChange={() => toggle(c.slug)} />
            <span className="text-sm">{tCat(c.slug)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function MapPlaceholder() {
  const t = useTranslations("map");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const [active, setActive] = useState<Set<CategorySlug>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [mapSrc, setMapSrc] = useState(TBILISI_DEFAULT);

  const places = useMemo(
    () =>
      active.size === 0
        ? mockPlaces.filter((p) => p.citySlug === "tbilisi")
        : mockPlaces.filter(
            (p) => p.citySlug === "tbilisi" && p.categories.some((c) => active.has(c)),
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

  function select(place: Place) {
    setSelected(place.id);
    setMapSrc(embedUrl(place));
  }

  const selectedPlace = places.find((p) => p.id === selected) ?? null;
  const selectedName = selectedPlace
    ? locale === "ka"
      ? selectedPlace.nameKa
      : selectedPlace.name
    : "";

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4">
        <p className="text-sm font-medium">{t("filters")}</p>
      </div>
      <div className="p-4 border-b border-border">
        <FilterPanel active={active} toggle={toggle} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {places.map((p) => {
          const name = locale === "ka" ? p.nameKa : p.name;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => select(p)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/50 ${
                isSelected ? "bg-accent" : ""
              }`}
            >
              <MapPin
                className={`size-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.categories.slice(0, 2).map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {tCat(c)}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr] md:grid-cols-[320px_1fr] md:grid-rows-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border bg-card overflow-hidden">
        {Sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-2 border-b border-border bg-card p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <ListFilter className="size-4" /> {t("filters")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("filters")}</SheetTitle>
            </SheetHeader>
            {Sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {/* Map area */}
      <div className="relative overflow-hidden">
        <iframe
          key={mapSrc}
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Tbilisi map"
        />

        {/* Selected place card */}
        {selectedPlace && (
          <div className="absolute inset-x-3 bottom-3 md:left-auto md:right-4 md:bottom-4 md:max-w-sm pointer-events-none">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg pointer-events-auto">
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
                  <Link href={`/places/${selectedPlace.slug}`}>{t("showList")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
