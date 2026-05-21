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

No test runner yet.

## Next.js 16 breaking changes

`params` (and `searchParams`) in page/layout props is a **Promise** — always `await` it:

```ts
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
}
```

Read `node_modules/next/dist/docs/` before adding any new Next.js APIs or patterns.

## Architecture

**Locale routing** — all user-facing routes live under `src/app/[locale]/`. Middleware in `src/proxy.ts` (next-intl) handles redirect and locale detection. Locales: `en`, `ka`, prefix always present.

**i18n** — next-intl 4. Server components call `setRequestLocale(locale)` before any rendering. Use `Link`, `useRouter`, `redirect` from `@/i18n/navigation` (locale-aware wrappers), never from `next/navigation` directly. Add keys to both `messages/en.json` and `messages/ka.json` together.

**Database** — MongoDB via Mongoose. Connection singleton in `src/lib/db.ts` (call `await connectDB()` before any model query). Models in `src/lib/models/`: `CityModel`, `PlaceModel`, `TicketModel`, `ReservationModel`, `ItineraryModel`, `UserModel`. Types in `src/types/index.ts` mirror the model shapes. Mock data in `src/lib/mock/` is kept for the seed script only — pages query MongoDB directly.

**Data fetching pattern** — server components call `connectDB()` then query models directly. No HTTP fetch round-trip from server to own API routes. API routes (`src/app/api/`) are for client-side fetch and external consumers.

**Auth** — NextAuth v5 (`next-auth@beta`). Config in `src/lib/auth.ts`. Credentials provider with bcrypt passwords; JWT sessions (no DB adapter). `auth()` in server components returns session. `useSession` / `signIn` / `signOut` from `next-auth/react` in client components. `SessionProvider` lives in `src/components/providers.tsx`, wrapped around the locale layout. Sign-up goes to `POST /api/register`, then `signIn("credentials", ...)`.

**shadcn/ui** — uses `@base-ui/react` (not Radix UI). Style: `base-nova`. Add components via `npx shadcn add <component>`. Primitives live in `src/components/ui/`, do not edit manually.

**Component layout:**
- `src/components/ui/` — shadcn primitives
- `src/components/site/` — shared site components (header, footer, cards, forms)
- `src/components/chat/`, `map/`, `admin/` — feature-scoped components

**Admin section** — `src/app/[locale]/admin/` has its own layout with sidebar nav. Not auth-gated yet.

## Current phase

Phase 2 + auth complete. MongoDB live, all pages read from DB, sign-up/sign-in works.

Upcoming: Phase 4 (AI chat via Anthropic SDK with streaming + tool use), Phase 5 (Mapbox), Phase 6 (Stripe). See `plan.md` for full roadmap and `.env.local.example` for planned env vars.
