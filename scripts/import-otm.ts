/**
 * Import POIs from OpenTripMap into MongoDB.
 *
 * SETUP
 * ─────
 * Add to .env.local:  OPENTRIPMAP_API_KEY=your_key_here
 *
 * RUN
 * ───
 * npx tsx --env-file=.env.local scripts/import-otm.ts
 *
 * What it does:
 * - Fetches top POIs for each configured city via OTM radius search
 * - Maps OTM "kinds" to app CategorySlug values
 * - Upserts into MongoDB (slug = otm_<xid>, skips existing)
 * - Rate-limited to 1 req/sec (OTM free tier limit)
 */

import mongoose from "mongoose";

const OTM_KEY = process.env.OPENTRIPMAP_API_KEY;
if (!OTM_KEY) {
  console.error("❌  OPENTRIPMAP_API_KEY not set in .env.local");
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

// ── Config ───────────────────────────────────────────────────────────

const CITIES: Array<{ slug: string; name: string; lat: number; lon: number; radius: number }> = [
  { slug: "tbilisi",  name: "Tbilisi",  lat: 41.6938, lon: 44.8015, radius: 6000 },
  { slug: "batumi",   name: "Batumi",   lat: 41.6417, lon: 41.6367, radius: 5000 },
  { slug: "kutaisi",  name: "Kutaisi",  lat: 42.2679, lon: 42.7181, radius: 5000 },
  { slug: "mtskheta", name: "Mtskheta", lat: 41.8456, lon: 44.7198, radius: 3000 },
  { slug: "sighnaghi",name: "Sighnaghi",lat: 41.6189, lon: 45.9215, radius: 3000 },
];

// OTM kinds → app CategorySlug
const KIND_MAP: Record<string, string> = {
  museums:                "museum",
  historic_architecture:  "sight",
  fortifications:         "sight",
  churches:               "sight",
  cathedrals:             "sight",
  monasteries:            "sight",
  architecture:           "sight",
  monuments:              "sight",
  archaeology:            "sight",
  cultural:               "sight",
  theatres_and_entertainments: "sight",
  parks:                  "park",
  natural:                "park",
  gardens:                "park",
  cafes:                  "cafe",
  restaurants:            "restaurant",
  shops:                  "shop",
  wineries:               "wine",
  wine_taste:             "wine",
};

// Minimum OTM "rate" (0-3) to import
const MIN_RATE = 2;
// Max places per city
const MAX_PER_CITY = 100;

// ── OTM API types ────────────────────────────────────────────────────

interface OTMListItem {
  xid: string;
  name: string;
  rate: number;
  kinds: string;
  point: { lon: number; lat: number };
}

interface OTMDetail {
  xid: string;
  name: string;
  kinds: string;
  rate: number;
  point: { lon: number; lat: number };
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    country?: string;
  };
  wikipedia_extracts?: { text?: string };
  preview?: { source?: string };
  url?: string;
}

// ── Mongoose schema (minimal — avoids importing next/* modules) ───────

const PlaceSchema = new mongoose.Schema(
  {
    slug:        { type: String, required: true, unique: true },
    citySlug:    { type: String, required: true, index: true },
    name:        { type: String, required: true },
    description: String,
    categories:  [String],
    images:      [String],
    geo: {
      lng:     Number,
      lat:     Number,
      address: String,
    },
    rating:      { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    tags:        [String],
    reservable:  { type: Boolean, default: false },
    status:      { type: String, default: "active" },
    featured:    { type: Boolean, default: false },
    extPlaceId:  { type: String, index: true, sparse: true },
    website:     String,
  },
  { timestamps: true },
);

const Place = mongoose.models.Place ?? mongoose.model("Place", PlaceSchema);

// ── Helpers ──────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mapCategory(kinds: string): string {
  for (const kind of kinds.split(",")) {
    const cat = KIND_MAP[kind.trim()];
    if (cat) return cat;
  }
  return "sight";
}

function buildAddress(detail: OTMDetail): string {
  const a = detail.address;
  if (!a) return "";
  const parts = [a.road, a.house_number, a.city].filter(Boolean);
  return parts.join(", ");
}

function buildSlug(xid: string): string {
  return `otm_${xid}`;
}

async function fetchList(city: (typeof CITIES)[0]): Promise<OTMListItem[]> {
  const url =
    `https://api.opentripmap.com/0.1/en/places/radius` +
    `?radius=${city.radius}` +
    `&lon=${city.lon}` +
    `&lat=${city.lat}` +
    `&kinds=interesting_places` +
    `&rate=${MIN_RATE}` +
    `&limit=${MAX_PER_CITY}` +
    `&format=json` +
    `&apikey=${OTM_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM list error ${res.status}: ${await res.text()}`);
  return (await res.json()) as OTMListItem[];
}

async function fetchDetail(xid: string): Promise<OTMDetail> {
  const url = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OTM_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM detail error ${res.status} for ${xid}`);
  return (await res.json()) as OTMDetail;
}

// ── Main ─────────────────────────────────────────────────────────────

async function importCity(city: (typeof CITIES)[0]) {
  console.log(`\n── ${city.name} ──`);

  let items: OTMListItem[];
  try {
    items = await fetchList(city);
  } catch (err) {
    console.error(`  ✗ fetch list: ${(err as Error).message}`);
    return { inserted: 0, skipped: 0, failed: 0 };
  }
  await sleep(1000);

  // Filter out unnamed places
  const named = items.filter((i) => i.name && i.name.trim());
  console.log(`  ${named.length} named POIs found (rate≥${MIN_RATE})`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of named) {
    const slug = buildSlug(item.xid);

    // Skip if already in DB
    const exists = await Place.exists({ slug });
    if (exists) {
      skipped++;
      continue;
    }

    let detail: OTMDetail;
    try {
      detail = await fetchDetail(item.xid);
      await sleep(1000); // respect 1 req/sec limit
    } catch (err) {
      console.error(`  ✗ ${item.name}: ${(err as Error).message}`);
      failed++;
      await sleep(1000);
      continue;
    }

    const category = mapCategory(detail.kinds);
    const address = buildAddress(detail);
    const description = detail.wikipedia_extracts?.text?.slice(0, 500) ?? "";
    const image = detail.preview?.source ?? "";

    try {
      await Place.create({
        slug,
        citySlug: city.slug,
        name: detail.name || item.name,
        description,
        categories: [category],
        images: image ? [image] : [],
        geo: {
          lng: detail.point.lon,
          lat: detail.point.lat,
          address,
        },
        tags: detail.kinds.split(",").map((k) => k.trim()).filter(Boolean),
        website: detail.url ?? "",
        extPlaceId: detail.xid,
        status: "active",
      });
      console.log(`  ✓ ${detail.name || item.name} [${category}]`);
      inserted++;
    } catch (err) {
      // E11000 = duplicate slug race — treat as skip
      if ((err as { code?: number }).code === 11000) {
        skipped++;
      } else {
        console.error(`  ✗ ${item.name}: DB insert: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  return { inserted, skipped, failed };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const city of CITIES) {
    const { inserted, skipped, failed } = await importCity(city);
    totalInserted += inserted;
    totalSkipped += skipped;
    totalFailed += failed;
  }

  console.log(
    `\n═══════════════════════════════════════`,
  );
  console.log(`Inserted: ${totalInserted}  Skipped: ${totalSkipped}  Failed: ${totalFailed}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
