# Implementation Plan — Flitt Payments

Step-by-step build order. Each step independently testable.

## Step 0 — Env + secrets
- Add `FLITT_MERCHANT_ID`, `FLITT_PAYMENT_KEY`, `FLITT_CREDIT_KEY`,
  `NEXT_PUBLIC_APP_URL` to `.env.local`.
- Confirm `.env.local` is gitignored.

## Step 1 — Flitt client lib (`src/lib/flitt.ts`)
- `flittSignature(params, secret)` — SHA1 algo (Node `crypto`).
- `verifyCallback(payload, secret)` — recompute + constant-time compare.
- `createCheckout({ orderId, amount, desc, callbackUrl, responseUrl })` →
  POST to `https://pay.flitt.com/api/checkout/url`, return `checkout_url` + `payment_id`.
- Unit-testable pure functions for signature.

## Step 2 — Payment model (`src/lib/models/payment.ts`)
- Schema per PRD §5. Unique index on `orderId`.

## Step 3 — Schema additions
- `Place`: `paid`, `services[]`.
- `Reservation`: `priceGEL`, `paymentStatus`.
- Update `src/types/index.ts` mirrors.

## Step 4 — Checkout route (`src/app/api/flitt/checkout/route.ts`)
- Auth via `auth()`. Validate `purpose` + `targetId`.
- Resolve amount server-side:
  - `listing_fee` → 5000 (50 GEL), verify caller owns the place + role business/admin/superadmin.
  - `reservation` → `Reservation.priceGEL`.
  - `ticket` → `Ticket.priceGEL`.
  - `service` → price of the matching `Place.services[]` entry.
- Create `Payment` (pending) → `createCheckout` → return `{ checkout_url }`.

## Step 5 — Callback route (`src/app/api/flitt/callback/route.ts`)
- Parse flat JSON. `verifyCallback`. If invalid → `400`.
- Lookup `Payment` by `orderId`. If already terminal → `200` no-op.
- On approved → `status:"paid"`, store `flittPaymentId` + `rawCallback`,
  apply side-effect by `purpose`. Else `failed`. Return `200`.

## Step 6 — Result page (`src/app/[locale]/payment/result/page.tsx`)
- Read `order_id` searchParam (awaited), query `Payment`, show status.
- i18n keys in en/ka/ru.

## Step 7 — Wire UI
- Business listing publish button → POST `/api/flitt/checkout` `{listing_fee, placeId}` → redirect.
- Reservation flow → after creating reservation with price, pay button.
- Ticket buy button. Service buy button on place page.

## Step 8 — Verify
- Use Flitt sandbox creds + test card first if available; else small live test.
- Confirm side-effects, idempotency (replay webhook), bad-signature rejection.

## Step 9 — Docs
- Update CLAUDE.md payments section + env var list.
