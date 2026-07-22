import type { GeocodeResult } from "@/types/transit";

// Tbilisi bounding box: left,top,right,bottom (lon,lat,lon,lat)
const TBILISI_VIEWBOX = "44.60,41.85,45.00,41.60";
const cache = new Map<string, { at: number; data: GeocodeResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Geocode a free-text query, biased to the Tbilisi bounding box, via Nominatim.
 * Returns up to 5 hits (top first). Never throws — network/parse failures yield
 * an empty array. Results are cached in-process for 5 minutes per query.
 *
 * Shared by the /api/transit/geocode route and the chat plan_transit tool.
 */
export async function geocodeTbilisi(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const key = q.toLowerCase();
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5` +
    `&viewbox=${TBILISI_VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Trip-Planner/1.0 (tbilisi transit planner)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const data: GeocodeResult[] = raw.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
    cache.set(key, { at: now, data });
    return data;
  } catch (e) {
    console.error("[transit] geocode failed:", e);
    return [];
  }
}

const reverseCache = new Map<string, { at: number; data: GeocodeResult | null }>();

/**
 * Reverse-geocode a coordinate to a single labeled result via Nominatim.
 * The returned lat/lng are the PASSED coordinates (the real device position),
 * not Nominatim's snapped echo — only the label comes from the response.
 * Never throws: network/parse failure or no match yields null. Cached
 * in-process for 5 minutes, keyed on coords rounded to 5 decimals.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const now = Date.now();
  const hit = reverseCache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Trip-Planner/1.0 (tbilisi transit planner)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as { display_name?: string } | null;
    const data: GeocodeResult | null = raw?.display_name
      ? { label: raw.display_name, lat, lng }
      : null;
    reverseCache.set(key, { at: now, data });
    return data;
  } catch (e) {
    console.error("[transit] reverse geocode failed:", e);
    return null;
  }
}
