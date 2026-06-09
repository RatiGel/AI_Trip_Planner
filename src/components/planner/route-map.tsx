"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker, LngLatBoundsLike } from "mapbox-gl";
import { useLocale } from "next-intl";
import type { RoutePlan } from "@/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Pin = {
  id: string;
  lng: number;
  lat: number;
  order: number;
  color: string;
  name: string;
  day: number;
};

function flatten(plan: RoutePlan, nameOf: (id: string) => string): Pin[] {
  return plan.days.flatMap((day) =>
    day.stops.map((s) => ({
      id: s.place.id,
      lng: s.place.geo.lng,
      lat: s.place.geo.lat,
      order: s.order,
      color: day.color,
      name: nameOf(s.place.id) || s.place.name,
      day: day.day,
    })),
  );
}

function makeMarkerEl(pin: Pin, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:28px",
    "height:28px",
    "border-radius:9999px",
    `background:${pin.color}`,
    "color:#fff",
    "font-weight:700",
    "font-size:13px",
    "cursor:pointer",
    "box-shadow:0 2px 6px rgba(0,0,0,.35)",
    `border:2px solid ${selected ? "#fff" : "transparent"}`,
    `transform:scale(${selected ? 1.25 : 1})`,
    "transition:transform .15s",
  ].join(";");
  el.textContent = String(pin.order);
  return el;
}

// ── Real Mapbox GL map (used when NEXT_PUBLIC_MAPBOX_TOKEN is set) ────
function MapboxMap({
  pins,
  plan,
  selectedId,
  onSelect,
}: {
  pins: Pin[];
  plan: RoutePlan;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markersRef = useRef<Map<string, MbMarker>>(new Map());
  const readyRef = useRef(false);

  // Init the map once, then (re)draw whenever the plan changes.
  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = TOKEN as string;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [pins[0].lng, pins[0].lat],
          zoom: 12,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      }
      const map = mapRef.current;

      const draw = () => {
        // Clear old markers.
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();

        // One line per day (straight segments between consecutive stops).
        // Swap this GeoJSON for Mapbox Directions geometry when a token route
        // service is wired in.
        const features = plan.days
          .filter((d) => d.stops.length > 1)
          .map((d) => ({
            type: "Feature" as const,
            properties: { color: d.color },
            geometry: {
              type: "LineString" as const,
              coordinates: d.stops.map((s) => [s.place.geo.lng, s.place.geo.lat]),
            },
          }));

        const data = { type: "FeatureCollection" as const, features };
        const existing = map.getSource("routes") as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource("routes", { type: "geojson", data });
          map.addLayer({
            id: "routes",
            type: "line",
            source: "routes",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 3,
              "line-opacity": 0.7,
            },
          });
        }

        // Markers.
        pins.forEach((pin) => {
          const el = makeMarkerEl(pin, pin.id === selectedId);
          el.addEventListener("click", () => onSelect(pin.id));
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([pin.lng, pin.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 18 }).setText(
                `${pin.order}. ${pin.name}`,
              ),
            )
            .addTo(map);
          markersRef.current.set(pin.id, marker);
        });

        // Fit to all stops.
        const bounds = pins.reduce(
          (b, p) => b.extend([p.lng, p.lat]),
          new mapboxgl.LngLatBounds([pins[0].lng, pins[0].lat], [
            pins[0].lng,
            pins[0].lat,
          ]),
        );
        map.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 15 });
        readyRef.current = true;
      };

      if (map.loaded()) draw();
      else map.once("load", draw);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // React to selection: highlight marker + fly to it + open popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;

    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const selected = id === selectedId;
      el.style.transform = `scale(${selected ? 1.25 : 1})`;
      el.style.border = `2px solid ${selected ? "#fff" : "transparent"}`;
    });

    map.flyTo({ center: [pin.lng, pin.lat], zoom: 15, speed: 1.4 });
    markersRef.current.get(selectedId)?.togglePopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── Fallback map (no Mapbox token): Leaflet + OpenStreetMap (free) ────
function FallbackMap({
  pins,
  plan,
  selectedId,
  onSelect,
}: {
  pins: Pin[];
  plan: RoutePlan;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylinesRef = useRef<import("leaflet").Polyline[]>([]);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      // Fix Leaflet default icon paths broken by bundlers
      // @ts-expect-error – _getIconUrl is internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      // Clear previous markers and polylines
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current = [];

      // Draw route polylines per day
      for (const day of plan.days) {
        if (day.stops.length < 2) continue;
        const coords = day.stops.map(
          (s) => [s.place.geo.lat, s.place.geo.lng] as [number, number],
        );
        const poly = L.polyline(coords, {
          color: day.color,
          weight: 3,
          opacity: 0.7,
          dashArray: "6 4",
        }).addTo(map);
        polylinesRef.current.push(poly);
      }

      // Draw numbered circle markers
      for (const pin of pins) {
        const icon = L.divIcon({
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:28px;height:28px;border-radius:9999px;
            background:${pin.color};color:#fff;font-weight:700;font-size:13px;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            border:2px solid ${pin.id === selectedId ? "#fff" : "transparent"};
            transform:scale(${pin.id === selectedId ? 1.25 : 1});
          ">${pin.order}</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${pin.order}. ${pin.name}</b>`);
        marker.on("click", () => onSelect(pin.id));
        markersRef.current.set(pin.id, marker);
      }

      // Fit to all stops
      const latLngs = pins.map((p) => [p.lat, p.lng] as [number, number]);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Re-highlight selected marker without full redraw
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const pin = pins.find((p) => p.id === selectedId);
      if (!pin) return;
      markersRef.current.forEach((marker, id) => {
        const selected = id === selectedId;
        marker.setIcon(
          L.divIcon({
            html: `<div style="
              display:flex;align-items:center;justify-content:center;
              width:28px;height:28px;border-radius:9999px;
              background:${pins.find((p) => p.id === id)?.color ?? "#888"};
              color:#fff;font-weight:700;font-size:13px;
              box-shadow:0 2px 6px rgba(0,0,0,.35);
              border:2px solid ${selected ? "#fff" : "transparent"};
              transform:scale(${selected ? 1.25 : 1});
            ">${pins.find((p) => p.id === id)?.order ?? ""}</div>`,
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        );
      });
      mapRef.current?.flyTo([pin.lat, pin.lng], 16, { duration: 0.8 });
      markersRef.current.get(selectedId)?.openPopup();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

export function RouteMap(props: {
  plan: RoutePlan;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const locale = useLocale();
  const nameOf = (id: string) => {
    for (const d of props.plan.days)
      for (const s of d.stops)
        if (s.place.id === id)
          return locale === "ka" ? s.place.nameKa : s.place.name;
    return "";
  };
  const pins = useMemo(
    () => flatten(props.plan, nameOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.plan, locale],
  );

  if (pins.length === 0) return null;
  const Impl = TOKEN ? MapboxMap : FallbackMap;
  return <Impl pins={pins} {...props} />;
}
