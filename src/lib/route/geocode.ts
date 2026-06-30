import type { Geo } from "@/types";

/** Tbilisi city centre — final fallback when nothing else resolves. */
export const TBILISI_CENTER: Geo = {
  lng: 44.8015,
  lat: 41.6938,
  address: "Tbilisi, Georgia",
};

/**
 * Hand-curated coordinates for common Tbilisi start points (hotels districts,
 * transit hubs, landmarks). Matched by case-insensitive substring so e.g.
 * "near Rustaveli" or "Rustaveli metro" both hit "rustaveli".
 */
const LANDMARKS: { keys: string[]; geo: Geo }[] = [
  { keys: ["rustaveli"], geo: { lng: 44.7995, lat: 41.6977, address: "Rustaveli Ave, Tbilisi" } },
  { keys: ["liberty", "freedom square", "tavisuplebis"], geo: { lng: 44.8019, lat: 41.6934, address: "Liberty Square, Tbilisi" } },
  { keys: ["old town", "old tbilisi", "kala", "abanotubani"], geo: { lng: 44.8089, lat: 41.6884, address: "Old Town, Tbilisi" } },
  { keys: ["station square", "vagzlis", "central station", "train station"], geo: { lng: 44.7935, lat: 41.7177, address: "Station Square, Tbilisi" } },
  { keys: ["airport", "tbs"], geo: { lng: 44.9547, lat: 41.6692, address: "Tbilisi International Airport" } },
  { keys: ["vake", "vake park"], geo: { lng: 44.7575, lat: 41.7095, address: "Vake, Tbilisi" } },
  { keys: ["saburtalo"], geo: { lng: 44.7411, lat: 41.7252, address: "Saburtalo, Tbilisi" } },
  { keys: ["marjanishvili"], geo: { lng: 44.7969, lat: 41.7081, address: "Marjanishvili, Tbilisi" } },
  { keys: ["avlabari", "avlabar"], geo: { lng: 44.8128, lat: 41.6926, address: "Avlabari, Tbilisi" } },
  { keys: ["dry bridge", "deserter"], geo: { lng: 44.8035, lat: 41.6989, address: "Dry Bridge, Tbilisi" } },
];

function matchLandmark(q: string): Geo | null {
  const lower = q.toLowerCase();
  for (const { keys, geo } of LANDMARKS) {
    if (keys.some((k) => lower.includes(k))) return geo;
  }
  return null;
}

/**
 * Geocode a free-text start location to coordinates.
 *
 * Order: known Tbilisi landmark table → Mapbox geocoding (if a server token is
 * configured) → city centre. Always resolves; never throws. The landmark table
 * is checked first because it is instant and covers the most common answers.
 */
export async function geocodeStart(query: string | undefined): Promise<Geo> {
  const q = query?.trim();
  if (!q) return TBILISI_CENTER;

  const landmark = matchLandmark(q);
  if (landmark) return landmark;

  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) {
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?proximity=${TBILISI_CENTER.lng},${TBILISI_CENTER.lat}&limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          features?: { center: [number, number]; place_name: string }[];
        };
        const f = data.features?.[0];
        if (f) {
          return { lng: f.center[0], lat: f.center[1], address: f.place_name };
        }
      }
    } catch {
      // fall through to centre
    }
  }

  return TBILISI_CENTER;
}
