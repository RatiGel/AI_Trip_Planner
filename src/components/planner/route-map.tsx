"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker, LngLatBoundsLike } from "mapbox-gl";
import { useLocale } from "next-intl";
import type { RoutePlan } from "@/types";
import type { DayTransitRoute, JourneyLeg, LatLng } from "@/types/transit";
import { legColor, stopMarkerHTML, WALK_COLOR } from "@/components/transit/leg-style";

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

/** One drawable line: either a real TTC leg or a dashed walk fallback. */
type TransitLine = {
  key: string;
  /** [lat, lng] pairs, matching JourneyLeg.points. */
  points: LatLng[];
  color: string;
  walk: boolean;
};

/** Boarding pin for a bus/metro leg. */
type BoardingPin = {
  key: string;
  pos: LatLng;
  mode: JourneyLeg["mode"];
  color: string;
};

/**
 * Flattens the per-day TTC routes into lines + boarding pins. Segments with no
 * TTC journey become a dashed straight walk line in the day's own colour, so
 * the route stays continuous and the gap is visible rather than silent.
 */
function transitGeometry(routes: DayTransitRoute[]): {
  lines: TransitLine[];
  boardings: BoardingPin[];
} {
  const lines: TransitLine[] = [];
  const boardings: BoardingPin[] = [];

  for (const route of routes) {
    route.segments.forEach((seg, si) => {
      const base = `d${route.day}s${si}`;
      if (!seg.journey) {
        // Grey like every other walk leg — the day colour is reserved for the
        // direct view, so a fallback reads as "walk", not "day 2".
        lines.push({
          key: base,
          points: [seg.from, seg.to],
          color: WALK_COLOR,
          walk: true,
        });
        return;
      }
      seg.journey.legs.forEach((leg, li) => {
        if (!leg.points || leg.points.length < 2) return;
        lines.push({
          key: `${base}l${li}`,
          points: leg.points,
          color: legColor(leg),
          walk: leg.mode === "walk",
        });
        if (leg.mode === "bus" || leg.mode === "metro") {
          boardings.push({
            key: `${base}l${li}`,
            pos: leg.points[0],
            mode: leg.mode,
            color: legColor(leg),
          });
        }
      });
    });
  }

  return { lines, boardings };
}

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
  transitRoutes,
  selectedId,
  onSelect,
}: {
  pins: Pin[];
  plan: RoutePlan;
  transitRoutes: DayTransitRoute[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markersRef = useRef<Map<string, MbMarker>>(new Map());
  const boardingsRef = useRef<MbMarker[]>([]);
  // Transit line layer/source ids currently on the map, so a redraw can clear
  // exactly what it added (the count varies with the number of legs).
  const transitLayersRef = useRef<string[]>([]);
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
        boardingsRef.current.forEach((m) => m.remove());
        boardingsRef.current = [];
        for (const id of transitLayersRef.current) {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        }
        transitLayersRef.current = [];

        if (transitRoutes) {
          // TTC view: one layer per leg so each can carry its own line colour
          // and dash pattern. The straight-line day source is emptied so the
          // two views never overlap.
          const direct = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
          direct?.setData({ type: "FeatureCollection", features: [] });

          const { lines, boardings } = transitGeometry(transitRoutes);
          lines.forEach((line) => {
            const id = `transit-${line.key}`;
            map.addSource(id, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: line.points.map(([lat, lng]) => [lng, lat]),
                },
              },
            });
            map.addLayer({
              id,
              type: "line",
              source: id,
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": line.color,
                "line-width": line.walk ? 3 : 5,
                "line-opacity": 0.9,
                ...(line.walk ? { "line-dasharray": [1, 1.8] } : {}),
              },
            });
            transitLayersRef.current.push(id);
          });

          boardings.forEach(({ key, pos: [lat, lng], mode, color }) => {
            const el = document.createElement("div");
            el.innerHTML = stopMarkerHTML(mode, color, 24);
            el.dataset.boarding = key;
            boardingsRef.current.push(
              new mapboxgl.Marker({ element: el, anchor: "bottom" })
                .setLngLat([lng, lat])
                .addTo(map),
            );
          });
        } else {
          // Direct view: one straight line per day between consecutive stops.
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

        // Fit to all stops — plus the transit geometry, which can swing wide of
        // the stops themselves (a bus detour, a metro line).
        const extra: [number, number][] = transitRoutes
          ? transitGeometry(transitRoutes).lines.flatMap((l) =>
              l.points.map(([lat, lng]) => [lng, lat] as [number, number]),
            )
          : [];
        const bounds = [...pins.map((p) => [p.lng, p.lat] as [number, number]), ...extra].reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds([pins[0].lng, pins[0].lat], [
            pins[0].lng,
            pins[0].lat,
          ]),
        );
        map.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 15 });
        readyRef.current = true;
      };

      if (map.loaded() && map.isStyleLoaded()) draw();
      else map.once("load", draw);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, transitRoutes]);

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
  transitRoutes,
  selectedId,
  onSelect,
}: {
  pins: Pin[];
  plan: RoutePlan;
  transitRoutes: DayTransitRoute[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylinesRef = useRef<import("leaflet").Polyline[]>([]);
  const boardingsRef = useRef<import("leaflet").Marker[]>([]);

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
      boardingsRef.current.forEach((m) => m.remove());
      boardingsRef.current = [];

      // Extra coordinates to include in the bounds — transit geometry can swing
      // wide of the stops themselves.
      const extra: [number, number][] = [];

      if (transitRoutes) {
        // TTC view: one polyline per leg, dashed for walking.
        const { lines, boardings } = transitGeometry(transitRoutes);
        for (const line of lines) {
          extra.push(...line.points);
          polylinesRef.current.push(
            L.polyline(line.points, {
              color: line.color,
              weight: line.walk ? 3 : 5,
              opacity: 0.9,
              dashArray: line.walk ? "4 7" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }).addTo(map),
          );
        }
        for (const { pos, mode, color } of boardings) {
          const icon = L.divIcon({
            html: stopMarkerHTML(mode, color, 24),
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 24], // bottom tip of the teardrop
          });
          boardingsRef.current.push(L.marker(pos, { icon }).addTo(map));
        }
      } else {
        // Direct view: one straight polyline per day.
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
      const latLngs = [...pins.map((p) => [p.lat, p.lng] as [number, number]), ...extra];
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, transitRoutes]);

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

export function RouteMap({
  transitRoutes = null,
  ...props
}: {
  plan: RoutePlan;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When set, the map draws real TTC bus/metro geometry instead of straight lines. */
  transitRoutes?: DayTransitRoute[] | null;
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
  return <Impl pins={pins} transitRoutes={transitRoutes} {...props} />;
}
