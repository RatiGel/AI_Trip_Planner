"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, ListFilter, MapPin, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGeolocation, type Coords } from "@/hooks/use-geolocation";
import { haversine, formatDistance } from "@/lib/geo";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug, Place } from "@/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Per-category accent colours
const CAT_COLOR: Record<string, string> = {
  museum: "#6366f1",
  sight: "#f59e0b",
  cafe: "#f97316",
  restaurant: "#ef4444",
  park: "#22c55e",
  wine: "#a855f7",
  shop: "#ec4899",
  club: "#3b82f6",
};

const CAT_EMOJI: Record<string, string> = {
  museum: "🏛",
  sight: "📸",
  cafe: "☕",
  restaurant: "🍽",
  park: "🌳",
  wine: "🍷",
  shop: "🛍",
  club: "🎵",
};

function placeColor(p: Place) {
  return CAT_COLOR[p.categories[0]] ?? "#64748b";
}
function placeEmoji(p: Place) {
  return CAT_EMOJI[p.categories[0]] ?? "📍";
}

// ── Mapbox GL JS map ─────────────────────────────────────────────────────────
function MapboxMap({
  places,
  selectedId,
  onSelect,
  userCoords,
}: {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userCoords: Coords | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("mapbox-gl").Marker>>(new Map());
  const userMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);

  // Build / rebuild markers whenever places change.
  useEffect(() => {
    if (!containerRef.current || !places.length) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = TOKEN as string;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [44.8015, 41.6938], // Tbilisi
          zoom: 12,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      }
      const map = mapRef.current;

      const addMarkers = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();

        for (const place of places) {
          if (!place.geo?.lng || !place.geo?.lat) continue;
          const color = placeColor(place);
          const emoji = placeEmoji(place);
          const isSel = place.id === selectedId;

          const el = document.createElement("div");
          el.innerHTML = `<div style="
            display:flex;align-items:center;justify-content:center;
            width:${isSel ? 36 : 30}px;height:${isSel ? 36 : 30}px;
            border-radius:9999px;background:${color};
            box-shadow:0 2px 8px rgba(0,0,0,.35);
            border:2.5px solid ${isSel ? "#fff" : "transparent"};
            font-size:${isSel ? 16 : 14}px;cursor:pointer;
            transition:all .15s;
          ">${emoji}</div>`;
          el.style.cssText = "width:auto;height:auto;background:none;border:none;";
          el.addEventListener("click", () => onSelect(place.id));

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([place.geo.lng, place.geo.lat])
            .addTo(map);
          markersRef.current.set(place.id, marker);
        }
      };

      if (map.loaded()) addMarkers();
      else map.once("load", addMarkers);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // Re-style markers and fly on selection change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      markersRef.current.forEach((marker, id) => {
        const place = places.find((p) => p.id === id);
        if (!place) return;
        const isSel = id === selectedId;
        const color = placeColor(place);
        const emoji = placeEmoji(place);
        const el = marker.getElement().firstElementChild as HTMLElement | null;
        if (el) {
          el.style.width = `${isSel ? 36 : 30}px`;
          el.style.height = `${isSel ? 36 : 30}px`;
          el.style.border = `2.5px solid ${isSel ? "#fff" : "transparent"}`;
          el.style.fontSize = `${isSel ? 16 : 14}px`;
          el.textContent = emoji;
          el.style.background = color;
        }
      });
      if (selectedId) {
        const p = places.find((pl) => pl.id === selectedId);
        if (p?.geo) map.flyTo({ center: [p.geo.lng, p.geo.lat], zoom: 16, speed: 1.4 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Visitor location: blue dot + accuracy circle. Separate effect so moving
  // the dot never rebuilds the place markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;

      const paint = () => {
        // Blue dot marker.
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.style.cssText =
            "width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.4);";
          userMarkerRef.current = new mapboxgl.Marker({ element: el });
        }
        userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]).addTo(m);

        // Accuracy circle as a GeoJSON source/layer.
        const data = {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: [userCoords.lng, userCoords.lat] },
        };
        const src = m.getSource("user-accuracy") as import("mapbox-gl").GeoJSONSource | undefined;
        if (src) {
          src.setData(data);
        } else {
          m.addSource("user-accuracy", { type: "geojson", data });
          m.addLayer({
            id: "user-accuracy",
            type: "circle",
            source: "user-accuracy",
            paint: {
              "circle-color": "#2563eb",
              "circle-opacity": 0.12,
              // Radius (px) = accuracy(m) / meters-per-pixel at this latitude/zoom.
              "circle-radius": [
                "interpolate", ["exponential", 2], ["zoom"],
                0, 0,
                22, ["/", userCoords.accuracy, ["/", 156543.03 * Math.cos(userCoords.lat * Math.PI / 180), ["^", 2, ["zoom"]]]],
              ],
            },
          });
        }
        m.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 15, speed: 1.2 });
      };

      if (m.loaded() && m.isStyleLoaded()) paint();
      else m.once("load", paint);
    })();

    return () => { cancelled = true; };
  }, [userCoords]);

  useEffect(() => {
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── Leaflet fallback ─────────────────────────────────────────────────────────
function LeafletMap({
  places,
  selectedId,
  onSelect,
  userCoords,
}: {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userCoords: Coords | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const userLayerRef = useRef<import("leaflet").Layer[]>([]);

  useEffect(() => {
    if (!containerRef.current || !places.length) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
        mapRef.current.setView([41.6938, 44.8015], 13);
      }
      const map = mapRef.current;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      for (const place of places) {
        if (!place.geo?.lng || !place.geo?.lat) continue;
        const isSel = place.id === selectedId;
        const color = placeColor(place);
        const emoji = placeEmoji(place);

        const icon = L.divIcon({
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:${isSel ? 36 : 30}px;height:${isSel ? 36 : 30}px;
            border-radius:9999px;background:${color};
            box-shadow:0 2px 8px rgba(0,0,0,.35);
            border:2.5px solid ${isSel ? "#fff" : "transparent"};
            font-size:${isSel ? 16 : 14}px;cursor:pointer;
          ">${emoji}</div>`,
          className: "",
          iconSize: [isSel ? 36 : 30, isSel ? 36 : 30],
          iconAnchor: [isSel ? 18 : 15, isSel ? 18 : 15],
        });

        const marker = L.marker([place.geo.lat, place.geo.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${place.name}</b>`);
        marker.on("click", () => onSelect(place.id));
        markersRef.current.set(place.id, marker);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    (async () => {
      const p = places.find((pl) => pl.id === selectedId);
      if (p?.geo) mapRef.current?.flyTo([p.geo.lat, p.geo.lng], 16, { duration: 0.8 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Visitor location: dot + accuracy circle (Leaflet).
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;
      userLayerRef.current.forEach((l) => l.remove());
      userLayerRef.current = [];

      const circle = L.circle([userCoords.lat, userCoords.lng], {
        radius: userCoords.accuracy,
        color: "#2563eb",
        weight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.12,
      }).addTo(map);
      const dot = L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(map);
      userLayerRef.current.push(circle, dot);
      map.flyTo([userCoords.lat, userCoords.lng], 15, { duration: 0.8 });
    })();
    return () => { cancelled = true; };
  }, [userCoords]);

  useEffect(() => {
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

const MapImpl = TOKEN ? MapboxMap : LeafletMap;

// ── Main explorer component ──────────────────────────────────────────────────
export function MapExplorer({ places }: { places: Place[] }) {
  const t = useTranslations("map");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const [active, setActive] = useState<Set<CategorySlug>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { coords: userCoords, loading: locating, error: geoError, locate } = useGeolocation();

  // Surface geolocation errors as a toast.
  useEffect(() => {
    if (geoError) toast.error(t(geoError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoError]);

  const filtered = useMemo(
    () =>
      active.size === 0
        ? places
        : places.filter((p) => p.categories.some((c) => active.has(c as CategorySlug))),
    [places, active],
  );

  // When we know the visitor's location, rank places nearest-first and attach
  // a formatted distance for display.
  const withDistance = useMemo(() => {
    if (!userCoords) return filtered.map((p) => ({ place: p, meters: null as number | null }));
    return filtered
      .map((p) => ({ place: p, meters: haversine(userCoords, p.geo) }))
      .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0));
  }, [filtered, userCoords]);

  const selected = filtered.find((p) => p.id === selectedId) ?? null;

  function toggle(c: CategorySlug) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
    setSelectedId(null);
  }

  const placeCount = filtered.length;
  const localName = (p: Place) => (locale === "ka" ? p.nameKa : p.name);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("filters")}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {placeCount} place{placeCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="border-b border-border p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={locate}
          disabled={locating}
        >
          <Crosshair className="size-4" />
          {locating ? t("locating") : t("nearMe")}
        </Button>
        <div className="mt-3 space-y-1.5">
          {mockCategories.map((c) => (
            <label
              key={c.slug}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
            >
              <Checkbox
                checked={active.has(c.slug)}
                onCheckedChange={() => toggle(c.slug)}
              />
              <span className="text-sm">{tCat(c.slug)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {CAT_EMOJI[c.slug]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {withDistance.map(({ place: p, meters }) => {
          const isSel = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(isSel ? null : p.id)}
              className={`flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent ${
                isSel ? "bg-accent" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0 text-base">{placeEmoji(p)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{localName(p)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {meters !== null && (
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const d = formatDistance(meters);
                        return t(d.unit === "km" ? "kmAway" : "mAway", { value: d.value });
                      })()}
                    </span>
                  )}
                  {p.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="size-2.5 fill-current" />
                      {p.rating.toFixed(1)}
                    </span>
                  )}
                  {p.categories.slice(0, 2).map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {tCat(c as CategorySlug)}
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
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr] md:grid-cols-[300px_1fr] md:grid-rows-1">
      {/* Desktop sidebar */}
      <aside className="hidden overflow-hidden border-r border-border bg-card md:flex md:flex-col">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center gap-2 border-b border-border bg-card p-2 md:hidden">
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
            {sidebar}
          </SheetContent>
        </Sheet>
        {selected && (
          <span className="truncate text-sm font-medium">{localName(selected)}</span>
        )}
      </div>

      {/* Map area */}
      <div className="relative overflow-hidden">
        <MapImpl
          places={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          userCoords={userCoords}
        />

        {/* Selected place card */}
        {selected && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 md:inset-x-auto md:bottom-4 md:right-4 md:max-w-xs">
            <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              {selected.images[0] && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary owner-supplied host, not in next.config remotePatterns */}
                  <img
                    src={selected.images[0]}
                    alt={localName(selected)}
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{localName(selected)}</p>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="shrink-0 rounded-md p-0.5 hover:bg-accent"
                    aria-label="Close"
                  >
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {selected.rating > 0 && (
                    <span className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="size-3.5 fill-current" />
                      {selected.rating.toFixed(1)}
                      <span className="text-xs text-muted-foreground">
                        ({selected.reviewCount})
                      </span>
                    </span>
                  )}
                  {selected.categories.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">
                      {tCat(c as CategorySlug)}
                    </Badge>
                  ))}
                </div>

                {selected.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {selected.description}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/places/${selected.slug}`}>View Details</Link>
                  </Button>
                  {selected.geo?.address && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selected.geo.lat},${selected.geo.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="size-3.5" /> Directions
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
