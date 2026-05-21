# AI Trip Planner — MVP Plan

**Goal:** Ship MVP fast. Core: AI itinerary chat, interactive map, ticket booking, user accounts.

---

## Phase 2 — Backend (current)

Connect real data. Replace all `src/lib/mock/` reads with API routes backed by MongoDB.

### 2.1 Database setup
- [ ] Add `MONGODB_URI` to `.env.local`
- [ ] Install `mongoose`
- [ ] `src/lib/db.ts` — connection singleton (reuse across hot reloads)
- [ ] Mongoose models matching existing types in `src/types/index.ts`:
  - `City`, `Place`, `TicketOption`, `Reservation`, `SavedItinerary`

### 2.2 API routes
All under `src/app/api/`:

| Route | Method | Description |
|---|---|---|
| `/api/cities` | GET | list cities |
| `/api/cities/[slug]` | GET | single city |
| `/api/places` | GET | list places (`?city=`, `?category=`) |
| `/api/places/[slug]` | GET | single place |
| `/api/tickets` | GET | list ticket options |
| `/api/reservations` | GET / POST | list / create reservation |
| `/api/trips` | GET / POST | saved itineraries |

### 2.3 Seed script
- [ ] `scripts/seed.ts` — import mock data into MongoDB once
- [ ] Run: `npx tsx scripts/seed.ts`

### 2.4 Swap mock → API in UI
- [ ] Replace direct mock imports with `fetch()` calls in server components
- [ ] Keep mock types as-is (Mongoose schema mirrors them)

---

## Phase 3 — Auth

Gate admin, enable saved trips and reservations per user.

- [ ] `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET` in `.env.local`
- [ ] Install `next-auth@beta` (Auth.js v5)
- [ ] `src/lib/auth.ts` — config with Google provider + MongoDB adapter
- [ ] Session available via `auth()` in server components
- [ ] Protect `src/app/[locale]/admin/` layout — redirect if no session
- [ ] Add `userId` to `Reservation` and `SavedItinerary` models
- [ ] `/api/auth/[...nextauth]` route handler

---

## Phase 4 — AI Chat

Core differentiator. Claude generates day-by-day itineraries from user prompts.

- [ ] `ANTHROPIC_API_KEY` in `.env.local`
- [ ] Install `@anthropic-ai/sdk`
- [ ] `src/app/api/chat/route.ts` — streaming POST handler
  - System prompt: city context, available places, user preferences
  - Tool use: `search_places`, `build_itinerary` (structured output)
  - Prompt caching on system prompt (reduces cost on repeat calls)
- [ ] `src/components/chat/` — wire up to real streaming endpoint (replace mock)
- [ ] Parse `SavedItinerary` from assistant tool call → save to DB
- [ ] Show itinerary on map after generation

---

## Phase 5 — Maps

- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- [ ] Install `mapbox-gl`, `react-map-gl`
- [ ] `src/components/map/Map.tsx` — base map component
- [ ] POI pins from places API
- [ ] Click pin → place detail drawer
- [ ] Highlight itinerary route after AI chat generates plan

---

## Phase 6 — Payments & Tickets

- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` in `.env.local`
- [ ] Install `stripe`, `resend`
- [ ] `src/app/api/checkout/route.ts` — create Stripe checkout session
- [ ] `src/app/api/webhooks/stripe/route.ts` — confirm ticket purchase
- [ ] Update `TicketOption` model with `stripeProductId`
- [ ] Email confirmation via Resend on successful purchase

---

## Deployment (decide before Phase 6)

**Recommended: Vercel** — zero-config Next.js, serverless API routes, env var UI.

Alternatives:
- Railway — full Node process, better for long-running WebSocket if needed later
- Self-hosted — more ops, not worth it at MVP stage

MongoDB: **MongoDB Atlas** free tier (M0) fine for MVP.

---

## MVP definition of done

- [ ] User lands on city page, sees real places
- [ ] User chats with AI, gets day-by-day itinerary on map
- [ ] User books a transit ticket via Stripe
- [ ] User account saves itineraries across sessions
- [ ] Admin can add/edit places via `/admin/`
