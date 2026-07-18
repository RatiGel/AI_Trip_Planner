# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000 (Turbopack)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint

# Seed MongoDB with mock data (run once, or to reset)
npx tsx --env-file=.env.local scripts/seed.ts
```

No test suite is configured yet.

## Next.js 16 Breaking Changes

`params` (and `searchParams`) in page/layout props is a **Promise** — always `await` it:

```ts
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
}
```

Read `node_modules/next/dist/docs/` before adding any new Next.js APIs or patterns.

## Architecture Overview

**AI Trip Planner** — trilingual (English, Georgian, Russian) tourism site for Georgia. Phases 2 and 3 are complete: MongoDB backend live, auth working.

### Routing

All user-facing pages live under `src/app/[locale]/`. The middleware in `src/proxy.ts` (oddly named — it is the Next.js middleware file, not a proxy) intercepts requests via next-intl and redirects `localhost:3000` → `/en/...`. The locale prefix is always present in the URL.

Import `Link`, `useRouter`, `redirect`, and `usePathname` from `src/i18n/navigation.ts`, **not** from `next/navigation` — this is the i18n-aware wrapper from next-intl.

### i18n

next-intl 4. Three locales: `en`, `ka`, `ru` (default: `en`). Server components call `setRequestLocale(locale)` before any rendering. Use `Link`, `useRouter`, `redirect` from `@/i18n/navigation` (locale-aware wrappers), never from `next/navigation` directly. Add keys to all three message files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together.

### Database

MongoDB via Mongoose. Connection singleton in `src/lib/db.ts` (call `await connectDB()` before any model query). Models in `src/lib/models/`: `CityModel`, `PlaceModel`, `TicketModel`, `ReservationModel`, `ItineraryModel`, `UserModel`. Types in `src/types/index.ts` mirror the model shapes.

Mock data in `src/lib/mock/` is still used by some pages (homepage `FeaturedPlaces`, chat suggestions) — not fully migrated to DB yet. The seed script at `scripts/seed.ts` populates MongoDB from the mock data.

### Data Fetching

Server components call `connectDB()` then query models directly. No HTTP fetch round-trip from server to own API routes. API routes (`src/app/api/`) are for client-side fetch and external consumers.

### Auth

NextAuth v5 (`next-auth@beta`). Config in `src/lib/auth.ts`. Credentials provider with bcrypt passwords; JWT sessions (no DB adapter). `auth()` in server components returns session. `useSession` / `signIn` / `signOut` from `next-auth/react` in client components. `SessionProvider` lives in `src/components/providers.tsx`, wrapped around the locale layout. Sign-up goes to `POST /api/register`, then `signIn("credentials", ...)`.

### Styling

- Tailwind CSS v4 — uses `@tailwindcss/postcss`, configured in `globals.css` (not `tailwind.config.js`)
- shadcn/ui built on `@base-ui/react` (not Radix UI) — style: `base-nova`, components in `src/components/ui/`
- Add shadcn components: `npx shadcn@latest add <component>`
- Theme variables defined in `src/app/globals.css`
- Utility: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)

### Component Organization

- `src/components/ui/` — shadcn primitives, never modify directly
- `src/components/site/` — shared app components (header, footer, cards, forms)
- `src/components/admin/` — admin-only components
- `src/components/chat/` — chat UI (`ChatUI`) streams real SSE responses from `POST /api/chat`; falls back to a heuristic mock itinerary only when no `ANTHROPIC_API_KEY`/`OPENROUTER_API_KEY` is configured (see `hasLLM` in `src/lib/ai/client.ts`)
- `src/components/map/` — `MapExplorer` is the live map (Mapbox GL if `NEXT_PUBLIC_MAPBOX_TOKEN` is set, else Leaflet/OSM fallback), plotting real DB places from `/map`; `map-placeholder.tsx` is unused dead code
- `src/components/site/home/` — homepage section components (HeroSection, StatsBar, CategoriesStrip, FeaturedPlaces, NeighborhoodsSection, AIPlannerCTA)

**Admin section** — `src/app/[locale]/admin/` has its own layout with sidebar nav. Pages: dashboard, cities, places (+ places/new), orders, reservations. Not auth-gated yet.

### Fonts

Three CSS variables from `next/font/google`:
- `--font-sans` — Inter (Latin)
- `--font-georgian` — Noto Sans Georgian
- `--font-display` — DM Serif Display

### Phase Roadmap

Phase 2 (MongoDB) + Phase 3 (Auth) complete. Pages read from DB, sign-up/sign-in works.

Upcoming:
4. **AI Chat** — Claude API (Anthropic SDK) with streaming + tool use for itinerary generation
5. **Maps** — Mapbox GL JS, geocoding, nearby search
6. **Payments** — Stripe + Resend for email confirmations

See `plan.md` for full roadmap. Environment variables needed: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`.
