import { NextRequest, NextResponse } from "next/server";
import type { GeocodeResult } from "@/types/transit";

export const runtime = "nodejs";

// Tbilisi bounding box: left,top,right,bottom (lon,lat,lon,lat)
const TBILISI_VIEWBOX = "44.60,41.85,45.00,41.60";
const cache = new Map<string, { at: number; data: GeocodeResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json([] as GeocodeResult[]);

  const key = q.toLowerCase();
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5` +
    `&viewbox=${TBILISI_VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Trip-Planner/1.0 (tbilisi transit planner)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json([] as GeocodeResult[]);
    const raw = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const data: GeocodeResult[] = raw.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
    cache.set(key, { at: now, data });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[transit] geocode failed:", e);
    return NextResponse.json([] as GeocodeResult[]);
  }
}
