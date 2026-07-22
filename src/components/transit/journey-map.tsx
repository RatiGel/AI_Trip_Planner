"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { JourneyPlan, JourneyLeg, LatLng } from "@/types/transit";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TBILISI: LatLng = [41.7151, 44.8271];
const OVERVIEW_ZOOM = 12;

function legColor(leg: JourneyLeg): string {
  if (leg.mode === "walk") return "#94a3b8";
  if (leg.color) return `#${leg.color}`;
  if (leg.mode === "metro") return "#7C3AED";
  if (leg.mode === "bus") return "#0891B2";
  return "#64748b";
}

/** All coordinates of a plan, in order — used for endpoints + bounds. */
function planPoints(plan: JourneyPlan): LatLng[] {
  return plan.legs.flatMap((l) => l.points ?? []);
}

// ── Mapbox GL ────────────────────────────────────────────────────────────────
function MapboxJourney({ plan }: { plan: JourneyPlan | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = TOKEN as string;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [TBILISI[1], TBILISI[0]],
          zoom: OVERVIEW_ZOOM,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      }
      const map = mapRef.current;

      const draw = () => {
        // Clear previous route (layers, sources, markers) regardless of plan.
        for (let i = 0; i < 12; i++) {
          const id = `leg-${i}`;
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        }
        document.querySelectorAll(".journey-marker").forEach((n) => n.remove());

        // No route selected → sit at the Tbilisi overview.
        if (!plan) {
          map.easeTo({ center: [TBILISI[1], TBILISI[0]], zoom: OVERVIEW_ZOOM, duration: 400 });
          return;
        }

        const all: [number, number][] = [];
        plan.legs.forEach((leg, i) => {
          if (!leg.points || leg.points.length < 2) return;
          const coords = leg.points.map(([lat, lng]) => [lng, lat] as [number, number]);
          all.push(...coords);
          const id = `leg-${i}`;
          map.addSource(id, {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
          });
          map.addLayer({
            id,
            type: "line",
            source: id,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": legColor(leg),
              "line-width": leg.mode === "walk" ? 3 : 5,
              "line-opacity": 0.9,
              ...(leg.mode === "walk" ? { "line-dasharray": [1, 1.8] } : {}),
            },
          });
        });

        const pts = planPoints(plan);
        if (pts.length) {
          addDot(mapboxgl, map, pts[0], "#111", "#fff");
          addDot(mapboxgl, map, pts[pts.length - 1], "#B5271D", "#fff");
        }

        if (all.length >= 2) {
          const b = all.reduce(
            (acc, c) => acc.extend(c),
            new mapboxgl.LngLatBounds(all[0], all[0]),
          );
          map.fitBounds(b, { padding: 56, maxZoom: 15, duration: 500 });
        }
      };

      if (map.loaded() && map.isStyleLoaded()) draw();
      else map.once("load", draw);
    })();

    return () => { cancelled = true; };
  }, [plan]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

function addDot(
  mapboxgl: (typeof import("mapbox-gl"))["default"],
  map: import("mapbox-gl").Map,
  [lat, lng]: LatLng,
  fill: string,
  ring: string,
) {
  const el = document.createElement("div");
  el.className = "journey-marker";
  el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${fill};border:3px solid ${ring};box-shadow:0 1px 6px rgba(0,0,0,.4);`;
  new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
}

// ── Leaflet fallback ───────────────────────────────────────────────────────────
function LeafletJourney({ plan }: { plan: JourneyPlan | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").Layer[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
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
        mapRef.current.setView(TBILISI, OVERVIEW_ZOOM);
      }
      const map = mapRef.current;

      // Clear previous route.
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];

      // No route selected → Tbilisi overview.
      if (!plan) {
        map.setView(TBILISI, OVERVIEW_ZOOM, { animate: true });
        return;
      }

      const all: LatLng[] = [];
      plan.legs.forEach((leg) => {
        if (!leg.points || leg.points.length < 2) return;
        all.push(...leg.points);
        const line = L.polyline(leg.points, {
          color: legColor(leg),
          weight: leg.mode === "walk" ? 3 : 5,
          opacity: 0.9,
          dashArray: leg.mode === "walk" ? "4 7" : undefined,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        layersRef.current.push(line);
      });

      const pts = planPoints(plan);
      if (pts.length) {
        layersRef.current.push(dot(L, map, pts[0], "#111"));
        layersRef.current.push(dot(L, map, pts[pts.length - 1], "#B5271D"));
      }

      if (all.length >= 2) map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15 });
    })();

    return () => { cancelled = true; };
  }, [plan]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

function dot(L: typeof import("leaflet"), map: import("leaflet").Map, pos: LatLng, fill: string) {
  const icon = L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${fill};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return L.marker(pos, { icon }).addTo(map);
}

const Impl = TOKEN ? MapboxJourney : LeafletJourney;

export function JourneyMap({ plan }: { plan: JourneyPlan | null }) {
  const t = useTranslations("transit");
  const hasRoute = !!plan && planPoints(plan).length >= 2;

  return (
    <div
      className="relative h-full min-h-[320px] overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--site-border-06)" }}
    >
      {/* Persistent map — keeps the Tbilisi overview until a route is chosen.
          A stable key means the map instance survives; only the drawn route swaps. */}
      <Impl plan={hasRoute ? plan : null} />

      {/* Idle hint floats over the live overview map. */}
      {!hasRoute && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <span
            className="rounded-full px-4 py-2 text-[13px] font-medium shadow-lg backdrop-blur"
            style={{ background: "var(--site-header-bg)", border: "1px solid var(--site-border-10)", color: "var(--site-text-65)" }}
          >
            {t("mapHint")}
          </span>
        </div>
      )}
    </div>
  );
}
