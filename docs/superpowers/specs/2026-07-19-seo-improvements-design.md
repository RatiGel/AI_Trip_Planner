# SEO Improvements — Design

Date: 2026-07-19
Status: Approved

## Goal

Improve organic search visibility for the trilingual Tbilisi tourism site against a target keyword set (things to do in Tbilisi, Tbilisi attractions, travel guide, itinerary, where to stay, restaurants/cafés/Georgian food, nightlife, shopping, events, public transport, airport transfer, safety, day trips, best time to visit, trip planner, city tours, boats/activities, must-see places). Currently the site has **no page-level metadata** (only one generic title/description on the root layout), **no sitemap.xml or robots.txt**, and **no structured data (schema.org)** anywhere in the codebase.

## Domain

Canonical production domain: `exploretbilisi.online` (apex, no `www`). All canonical URLs, sitemap entries, and OG/Twitter metadata use `https://exploretbilisi.online`. If `www.exploretbilisi.online` is also live, it should redirect to the apex (not handled by this spec — a hosting/DNS concern).

## Scope

**In scope (core public pages):**
- `/` (home)
- `/cities`, `/cities/[slug]`
- `/places/[slug]`
- `/food`
- `/discover`
- `/events`
- `/experiences`
- `/travel-info` (extend existing metadata, doesn't yet have schema/FAQ markup)
- `/map`
- `/planner`

**Out of scope:** `/admin/**`, `/business/**`, `/superadmin/**`, `/login`, `/register`, `/profile`, `/reservations`, `/reserve/**`, `/trips/**`, `/tickets`, `/payment/**`, `/deals`, `/list-your-business` — not indexed targets for this round, excluded via `robots.ts`.

**Flagged as future work, not built this round** (keyword clusters with no dedicated page today):
- Nightlife — folded into `/food` page copy/FAQ for now
- Shopping — no page exists
- Day trips from Tbilisi — no page exists
- Best time to visit — folded into `/travel-info` (`WeatherSeasons` section) for now
- Boats and main activities — folded into `/experiences` for now
- Where to stay in Tbilisi — no page exists (no accommodation/listings feature yet)

## Architecture

### 1. Site-wide foundation

**`src/app/sitemap.ts`** (Next.js MetadataRoute.Sitemap)
- Static routes (home, cities, food, discover, events, experiences, travel-info, map, planner) × all 3 locales, each with `alternates.languages` entries pointing to the other two locales (hreflang).
- Dynamic routes: query `CityModel` and `PlaceModel` (published only, via existing `PUBLISHED` filter) for slugs, generate `/cities/[slug]` and `/places/[slug]` entries × 3 locales.
- Requires `await connectDB()` inside the sitemap function, same pattern as existing DB-backed pages.

**`src/app/robots.ts`** (Next.js MetadataRoute.Robots)
- Allow `/`, disallow `/admin`, `/business`, `/superadmin`, `/api`, `/login`, `/register`, `/profile`, `/reservations`, `/reserve`, `/trips`, `/tickets`, `/payment`.
- `sitemap: "https://exploretbilisi.online/sitemap.xml"`.

**`src/lib/seo.ts`** — shared helper, used by every page's `generateMetadata`:
```ts
buildMetadata({ locale, path, title, description, image? }): Metadata
```
Returns `alternates.canonical`, `alternates.languages` (hreflang for en/ka/ru), `openGraph` (type, locale, url, title, description, images), `twitter` (summary_large_image). Centralizes the URL-building logic so individual pages just pass title/description.

**`src/components/site/json-ld.tsx`** — small component:
```tsx
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
```
Safe because `data` is always server-constructed from DB/static content, never raw user input.

**Root `[locale]/layout.tsx`:**
- Add `metadataBase: new URL("https://exploretbilisi.online")` to the root `generateMetadata`.
- Add `alternates` (canonical + hreflang for `/`) to the root metadata as a fallback for pages without their own.

**`messages/{en,ka,ru}.json`:**
- Rewrite `site.name` / `site.tagline` to front-load primary keywords while keeping the brand recognizable:
  - EN: name stays `ExploreTbilisi` (rename from `TbilisiTrip`... — confirm exact brand string during implementation by checking header/footer usages), tagline → "Tbilisi Travel Guide & AI-Powered Trip Planner"
  - KA/RU: equivalent localized taglines carrying the same keyword intent (e.g. RU: "Гид по Тбилиси и ИИ-планировщик поездок").
- Title template remains `%s · {name}`.

### 2. Per-page metadata + structured data

Every in-scope page adds `generateMetadata` (currently missing except `/travel-info`) using `buildMetadata()`, with copy targeting its keyword cluster:

| Page | Title (EN example) | Primary keywords | Schema |
|---|---|---|---|
| `/` | "Tbilisi Travel Guide & AI Trip Planner \| ExploreTbilisi" | trip planner for Tbilisi, website for Tbilisi, Tbilisi travel guide | `WebSite` + `Organization` |
| `/cities/[slug]` | "{City} Travel Guide — Things to Do & Attractions" | things to do in {city}, {city} attractions | `TouristDestination` (real DB geo/address/description) |
| `/places/[slug]` | "{Place Name} — {City} \| Reviews, Hours & Map" | must-see places, main attractions | `TouristAttraction` or `LocalBusiness` (rating, address, hours from DB) |
| `/food` | "Best Restaurants & Cafés in Tbilisi — Georgian Food & Wine Guide" | best restaurants, cafés, Georgian food, nightlife | `ItemList` of `Restaurant`/`CafeOrCoffeeShop` entries |
| `/discover` | "Tbilisi Attractions — Must-See Places & Main Attractions" | Tbilisi attractions, must see places, main attractions | `ItemList` of `TouristAttraction` |
| `/experiences` | "Things to Do in Tbilisi — City Tours, Boats & Activities" | city tours, boats, activities, things to do | `ItemList` of `TouristAttraction`/`Event` |
| `/events` | "Events in Tbilisi — What's On This Week" | events in Tbilisi | `ItemList` of `Event` |
| `/travel-info` | extend existing title/description | public transport, airport transfer, safety, best time to visit | `FAQPage` (from existing `FaqAccordion` content) |
| `/map` | "Tbilisi Map — Explore Attractions & Plan Your Route" | Tbilisi map, trip planner | none needed |
| `/planner` | "AI Trip Planner for Tbilisi — Build Your Itinerary" | trip planner, Tbilisi itinerary | none needed |

### 3. Internal linking

Add a compact "Related guides" link cluster (same pattern as the existing `RelatedLinks` component used on `/travel-info`) to `/food`, `/discover`, `/experiences`, `/events`, cross-linking to each other plus `/travel-info` and `/planner`. This directly addresses the current lack of internal links between keyword-relevant pages.

### 4. Long-tail FAQ content

For `/food`, `/discover`, `/experiences`, `/events` — add a short FAQ block (3–4 Q&As) phrased as real traveler questions (e.g. "What is the best area to eat in Tbilisi?", "Is nightlife in Tbilisi good?", "What are the must-see attractions in Tbilisi?"), reusing the `FaqAccordion` component already built for `/travel-info`. Each FAQ block gets `FAQPage` JSON-LD via the shared `JsonLd` component.

`/travel-info`'s existing FAQ content gets `FAQPage` schema added (content already covers safety, transport, airport transfer — just needs the markup).

## Data flow

No new data sources. Metadata for `/cities/[slug]` and `/places/[slug]` reads from existing `CityModel`/`PlaceModel` queries already present in those pages (add `generateMetadata` alongside the existing page component, reusing the same DB query — Next.js dedupes identical fetches, but since these are direct Mongoose calls, not `fetch`, we accept a small duplicate query rather than adding a request-memoization layer; acceptable given traffic scale). Sitemap runs a lightweight separate query for slugs only.

## Testing

No test suite configured in this repo (per CLAUDE.md). Verification is manual:
- `npm run build` succeeds with new `sitemap.ts`/`robots.ts` routes.
- Visit `/sitemap.xml` and `/robots.txt` in dev, confirm valid output and correct URLs.
- Spot-check `view-source:` on `/`, `/food`, `/cities/tbilisi` (or whatever seeded slug), `/places/[a-seeded-slug]` for correct `<title>`, `<meta description>`, `<link rel="canonical">`, `<link rel="alternate" hreflang>`, and `<script type="application/ld+json">` blocks.
- Validate JSON-LD output with Google's Rich Results Test (paste rendered HTML) — manual, outside the coding task.
- Confirm `next-intl` translations render correctly in all 3 locales for any new/changed message keys (no missing-key console warnings in dev).

## Follow-up recommendations (not built this round)

Dedicated pages/content needed for full keyword coverage:
1. **Where to stay in Tbilisi** — needs an accommodation/neighborhood-guide page (no hotel/listing data model exists yet).
2. **Shopping in Tbilisi** — no page exists.
3. **Day trips from Tbilisi** — no page exists (Mtskheta, Kazbegi, Sighnaghi, etc.).
4. **Best time to visit Tbilisi** — currently just a subsection of `/travel-info`; could warrant its own long-form page/blog post for the specific keyword.
5. Consider a `/blog` or `/guides` section for long-tail, question-based content ("Is Tbilisi safe for solo travelers?", "How many days do you need in Tbilisi?") that doesn't fit naturally into existing category pages — this is where most long-tail traveler-question search volume tends to land.
