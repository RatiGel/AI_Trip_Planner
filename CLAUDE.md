# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000 (Turbopack)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

No test runner yet.

## Next.js 16 breaking changes

`params` (and `searchParams`) in page/layout props is now a **Promise** — always `await` it:

```ts
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
}
```

Read `node_modules/next/dist/docs/` before adding any new Next.js APIs or patterns.

## Architecture

**Locale routing** — all user-facing routes live under `src/app/[locale]/`. Middleware in `src/proxy.ts` (next-intl) handles redirect and locale detection. Locales: `en`, `ka`, prefix always present.

**i18n** — next-intl 4. Server components call `setRequestLocale(locale)` before any rendering. Use `Link`, `useRouter`, `redirect` from `@/i18n/navigation` (locale-aware wrappers), never from `next/navigation` directly.

**Translations** — `messages/en.json` and `messages/ka.json`. Add keys to both files together.

**Mock data** — `src/lib/mock/` holds typed fake data (cities, places, categories, tickets, trips). These are the source of truth in Phase 1. Their shapes match the planned Mongoose models in `src/types/index.ts`.

**shadcn/ui** — uses `@base-ui/react` (not Radix UI). Style: `base-nova`. Add components via `npx shadcn add <component>`. Primitives live in `src/components/ui/`.

**Component layout:**
- `src/components/ui/` — shadcn primitives, don't edit manually
- `src/components/site/` — shared site components (header, footer, cards, forms)
- `src/components/chat/`, `map/`, `admin/` — feature-scoped components

**Admin section** — `src/app/[locale]/admin/` has its own layout with sidebar nav. No auth gating yet (Phase 3).

## Current phase

Phase 1: frontend only. No database, no auth, no real AI/payments. All data comes from `src/lib/mock/`. Upcoming phases will add MongoDB/Mongoose, Auth.js, Mapbox, Claude API (Anthropic SDK), and Stripe — see `.env.local.example` for planned env vars.
