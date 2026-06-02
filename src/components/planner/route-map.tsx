"use client";

import "mapbox-gl/dist/mapbox-gl.css";
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

// ── Fallback map (no token): normalized projection over the plan's bbox ──
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
  const bbox = useMemo(() => {
    const lngs = pins.map((p) => p.lng);
    const lats = pins.map((p) => p.lat);
    const pad = 0.004;
    return {
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
    };
  }, [pins]);

  const project = (lng: number, lat: number) => {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * 100;
    const y = 100 - ((lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)) * 100;
    return { x: Math.max(3, Math.min(97, x)), y: Math.max(4, Math.min(96, y)) };
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#dbeafe,transparent_60%),radial-gradient(circle_at_80%_70%,#ddd6fe,transparent_55%),#f8fafc]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.05) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
        Map preview · add NEXT_PUBLIC_MAPBOX_TOKEN for live map
      </div>

      {/* Polylines per day */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {plan.days
          .filter((d) => d.stops.length > 1)
          .map((d) => {
            const pts = d.stops
              .map((s) => {
                const { x, y } = project(s.place.geo.lng, s.place.geo.lat);
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <polyline
                key={d.day}
                points={pts}
                fill="none"
                stroke={d.color}
                strokeWidth={0.6}
                strokeOpacity={0.7}
                strokeDasharray="1.5 1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
      </svg>

      {pins.map((pin) => {
        const { x, y } = project(pin.lng, pin.lat);
        const selected = pin.id === selectedId;
        return (
          <button
            key={pin.id}
            onClick={() => onSelect(pin.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            aria-label={`${pin.order}. ${pin.name}`}
          >
            <span
              className="flex items-center justify-center rounded-full font-bold text-white shadow-md transition-transform"
              style={{
                background: pin.color,
                width: selected ? 34 : 28,
                height: selected ? 34 : 28,
                border: selected ? "2px solid #fff" : "2px solid transparent",
                fontSize: 13,
              }}
            >
              {pin.order}
            </span>
            {selected && (
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-medium shadow-lg">
                {pin.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
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
