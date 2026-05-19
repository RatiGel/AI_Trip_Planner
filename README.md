# AI Trip Planner — Tbilisi & Georgia

AI-powered tourism site for Georgia. Admin curates POIs (museums, sights, cafes,
nightlife, etc.); visitors get a Claude-powered chat that builds day-by-day
itineraries, browse on a map, reserve tables, and buy bus / rail / Tbilisi
transit tickets.

**Phase 1 (this repo, current state):** frontend only, runs on hardcoded mock
data — no DB, no auth, no real AI calls. Every screen is reachable end-to-end
in both English and Georgian.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui (on `@base-ui/react`)
- next-intl 4 (en + ka)
- lucide-react icons, sonner toasts

Planned for later phases: Mongoose / MongoDB, Auth.js, Mapbox, Claude API
(Anthropic SDK), Stripe, Resend.

## Getting started

```bash
npm install
npm run dev   # http://localhost:3000 → redirects to /en
```

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint
```

## Folder layout

```
src/
  app/
    [locale]/
      page.tsx                 # landing
      cities/                  # list + [slug] detail
      places/[slug]/           # POI detail
      map/                     # map view (mocked)
      chat/                    # AI chat UI (mocked replies)
      trips/                   # saved itineraries
      tickets/                 # bus / rail / transit pass
      reserve/[placeId]/       # reservation form
      admin/                   # admin dashboard
        places/{,new}/
        cities/
        reservations/
        orders/
      login/, register/        # auth UI (no logic yet)
  components/
    ui/                        # shadcn primitives
    site/                      # header, footer, cards, forms
    chat/, map/, admin/        # feature components
  i18n/
    routing.ts navigation.ts request.ts
  lib/
    mock/                      # fake data — same shape as future Mongoose models
    utils.ts
  types/index.ts
  proxy.ts                     # next-intl locale routing
messages/
  en.json, ka.json
```

## Phase roadmap

1. Frontend with mocked data — done
2. Backend + Mongoose models, API routes
3. Auth.js (credentials + Google) and admin role gating
4. Mapbox integration with geocoding + nearby search
5. Claude API (Anthropic SDK) chat with tool-use
6. Stripe payments + Resend confirmations
7. SEO, analytics, deploy to Vercel
