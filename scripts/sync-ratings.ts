/**
 * Sync Yelp ratings into MongoDB for every active place.
 *
 * SETUP
 * ─────
 * 1. Go to https://www.yelp.com/developers
 * 2. Sign up → Create App → copy the API Key
 * 3. Add to .env.local:  YELP_API_KEY=your_key_here
 *
 * RUN
 * ───
 * npx tsx --env-file=.env.local scripts/sync-ratings.ts
 *
 * Free tier: 500 calls/day — plenty for a weekly sync of hundreds of places.
 * Already-matched places (has extPlaceId) are refreshed; new ones are searched.
 */

import "dotenv/config";
import mongoose from "mongoose";

const YELP_KEY = process.env.YELP_API_KEY;
if (!YELP_KEY) {
  console.error(
    "❌  YELP_API_KEY is not set in .env.local\n" +
      "    See the SETUP section at the top of this file."
  );
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

// ── Minimal inline schema (avoids importing next/* modules) ──────────
const PlaceSchema = new mongoose.Schema({
  slug: String,
  name: String,
  citySlug: String,
  extPlaceId: String,
  extRating: Number,
  extReviewCount: Number,
  status: String,
});

const Place = mongoose.models.Place ?? mongoose.model("Place", PlaceSchema);

// ── Yelp Fusion API helpers ───────────────────────────────────────────

const YELP_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${YELP_KEY}`,
};

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;       // 1–5 scale
  review_count: number;
}

async function searchYelpPlace(name: string, citySlug: string): Promise<YelpBusiness | null> {
  const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const params = new URLSearchParams({
    term: name,
    location: `${cityName}, Georgia`,
    limit: "1",
  });

  const res = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
    headers: YELP_HEADERS,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Yelp search error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { businesses: YelpBusiness[] };
  return data.businesses[0] ?? null;
}

async function refreshYelpPlace(yelpId: string): Promise<YelpBusiness | null> {
  const res = await fetch(`https://api.yelp.com/v3/businesses/${yelpId}`, {
    headers: YELP_HEADERS,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Yelp details error ${res.status}: ${err}`);
  }

  return (await res.json()) as YelpBusiness;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const places = await Place.find({ status: { $ne: "rejected" } }).lean();
  console.log(`Found ${places.length} places to sync\n`);

  let matched = 0;
  let failed = 0;

  for (const place of places) {
    const p = place as {
      _id: mongoose.Types.ObjectId;
      name: string;
      citySlug: string;
      extPlaceId?: string;
    };

    try {
      let yb: YelpBusiness | null = null;

      if (p.extPlaceId) {
        yb = await refreshYelpPlace(p.extPlaceId);
        if (!yb) {
          console.log(`  ↻ ${p.name}: stale ID, re-searching…`);
          p.extPlaceId = undefined;
        }
      }

      if (!yb) {
        yb = await searchYelpPlace(p.name, p.citySlug);
      }

      if (!yb) {
        console.log(`  ✗ ${p.name}: no Yelp match`);
        failed++;
      } else {
        await Place.updateOne(
          { _id: p._id },
          {
            $set: {
              extPlaceId: yb.id,
              extRating: yb.rating,
              extReviewCount: yb.review_count,
            },
          }
        );
        console.log(`  ✓ ${p.name}: ★${yb.rating} (${yb.review_count} reviews)`);
        matched++;
      }
    } catch (err) {
      console.error(`  ✗ ${p.name}: ${(err as Error).message}`);
      failed++;
    }

    await sleep(200);
  }

  console.log(`\nDone. Matched: ${matched}, Failed: ${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
