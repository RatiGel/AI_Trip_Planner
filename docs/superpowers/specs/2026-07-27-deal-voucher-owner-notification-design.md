# Deal Voucher + Owner Notification — Design

**Date:** 2026-07-27
**Status:** Approved

## Goal

A logged-in user buys a deal from the deals category. On successful payment, a
voucher code is generated and shown to the buyer (payment result page +
reservations page). The business owner who listed the deal receives an in-app
notification containing the buyer's info and the voucher code, so they can
verify a voucher was legitimately purchased on the system.

## Context

- Deals are **mock-only** data (`src/lib/mock/deals.ts`, ids `deal-1`…`deal-6`).
  No `DealModel`, no DB record.
- Deals page: `src/app/[locale]/deals/page.tsx` → `DealsGrid` client component
  (`src/components/site/deals-grid.tsx`). "Grab" button calls `payNow({ purpose:
  "deal", targetId, amount, ... })`.
- Payments run through **Flitt** (Georgian gateway), not Stripe.
  - Client helper `payNow` → `POST /api/flitt/checkout` → redirect to hosted page.
  - Checkout (`src/app/api/flitt/checkout/route.ts`) resolves amount per
    `purpose`. Today, `deal` **allows guests** and **trusts client amount**
    (price-tamper hole) — see route lines ~78-84, 101-105.
  - Callback webhook (`src/app/api/flitt/callback/route.ts`) verifies signature,
    marks `Payment.status = "paid"`, then `applySideEffect()`. There is **no
    `deal` case** today.
  - Payment result page: `src/app/[locale]/payment/result/page.tsx` (server
    component, looks up `Payment` by `order_id`).
- Payment model (`src/lib/models/payment.ts`) already has optional `userId` and
  `businessOwnerId` fields.
- Reservations page (`src/app/[locale]/reservations/page.tsx`) is a server
  component querying Mongo directly; renders only place-based `ReservationModel`
  docs today.
- Admin section (`src/app/[locale]/admin/`) has its own sidebar layout. Not
  auth-gated yet.
- Auth: NextAuth v5, `auth()` in server components / API routes returns session;
  `session.user.id`, `session.user.role`, and (for notifications) name/email.

No voucher/code/notification concept exists anywhere in the codebase yet.

## Design Decisions

1. **New `Voucher` model** — clean separation from place-based reservations.
2. **Login required for deals** — voucher must key to a `userId`; drop the guest
   allowance for the `deal` purpose.
3. **Server-side deal price lookup from mock** — fixes the price-tamper hole
   without a DB migration. Deals stay mock (like homepage/chat). Voucher stores a
   snapshot (title, price).
4. **Voucher shown on both** payment result page (immediately) and reservations
   page ("My Deals" section). Display-only — no redeem action (YAGNI).
5. **Owner known via `ownerId` on mock deals** — wire the field on each
   `DealOption`, pointing to real `UserModel` owner ids.
6. **In-app notification** (new `Notification` model) — no external email
   dependency. Owner views them in admin.
7. **Owner views notifications at `/admin/notifications`** — fits the existing
   admin section; query scoped to the logged-in owner id.

## Components

### 1. Models

**`Voucher`** — `src/lib/models/voucher.ts`
- `code` (string, unique) — human-readable, e.g. `DEAL-A3F9-K2M1`
- `userId` (string, required)
- `dealId` (string) — mock id snapshot (`deal-1`)
- `dealTitle` (string) — snapshot
- `amountGEL` (number) — snapshot
- `paymentOrderId` (string) — links to the `Payment` row
- `status` enum `active | redeemed` (default `active`)
- `timestamps: true`, virtual `id`

**`Notification`** — `src/lib/models/notification.ts`
- `ownerId` (string, required)
- `type` enum `deal_purchase` (extensible)
- `dealId` (string)
- `dealTitle` (string)
- `voucherCode` (string)
- `buyerName` (string)
- `buyerEmail` (string)
- `amountGEL` (number)
- `paymentOrderId` (string)
- `read` (boolean, default `false`)
- `timestamps: true`, virtual `id`

Both mirrored as TypeScript types in `src/types/index.ts` (`Voucher`,
`Notification`).

### 2. Code generation — `src/lib/voucher.ts`

`generateVoucherCode()` → `DEAL-XXXX-XXXX` using Node `crypto` randomness, from an
unambiguous uppercase alphanumeric alphabet (no `0/O`, `1/I/L`). Caller retries on
DB unique-index collision (rare).

### 3. Mock deals — `src/lib/mock/deals.ts`

Add `ownerId: string` to each `DealOption`, wired to real `UserModel` owner ids.
Update the `DealOption` type in `src/types/index.ts`.

### 4. Checkout hardening — `src/app/api/flitt/checkout/route.ts`

In the `deal` branch of `resolve()`:
- **Require login** — return 401 if no session (remove the guest allowance for
  deals).
- **Server-side price** — import `mockDeals`, look up by `targetId`, use
  `deal.priceGEL`; ignore the client-supplied `amount`. Return 404 if the deal id
  is unknown.
- Set `Payment.userId` (from session) and `Payment.businessOwnerId` (from the
  deal's `ownerId`).

### 5. Callback side effect — `src/app/api/flitt/callback/route.ts`

Add `case "deal"` to `applySideEffect()`, **idempotent** (webhooks may fire more
than once): skip if a `Voucher` already exists for this `paymentOrderId`.
- Look up the deal from `mockDeals` by `payment.targetId` (title, ownerId).
- Look up the buyer from `UserModel` by `payment.userId` (name, email).
- Create the `Voucher` (generated code + snapshots).
- Create a `Notification` for `payment.businessOwnerId` carrying buyer name/email,
  deal title, voucher code, amount, and `paymentOrderId`.

### 6. Grab button — `src/components/site/deals-grid.tsx`

If the user is not logged in, redirect to sign-in with a callback back to
`/deals`. Otherwise call `payNow(...)` as today.

### 7. Payment result page — `src/app/[locale]/payment/result/page.tsx`

When the paid payment's `purpose === "deal"`, look up the `Voucher` by
`paymentOrderId` and show the code prominently ("Your voucher code: …").

### 8. Reservations page — `src/app/[locale]/reservations/page.tsx`

Add a "My Deals" section above/below the existing reservations: query
`Voucher.find({ userId })`, render cards with deal title, voucher code, amount, and
status badge. Existing reservations section unchanged.

### 9. Admin notifications — `src/app/[locale]/admin/notifications/page.tsx`

Server component: `Notification.find({ ownerId: session.user.id }).sort(newest)`.
Cards show buyer name/email, deal title, voucher code, amount, time, and a
read/unread badge. Add a sidebar nav link in the admin layout. Query scoped to the
logged-in owner id.

### 10. i18n

Add keys to `messages/en.json`, `messages/ka.json`, `messages/ru.json` together:
section titles ("My Deals", "Notifications"), "voucher code", status labels
(active/redeemed, read/unread), buyer labels, empty states.

## Data Flow

```
User (logged in) clicks Grab on a deal
  → deals-grid: authed? payNow({purpose:"deal", targetId}) : redirect sign-in
  → POST /api/flitt/checkout
      require session; price = mockDeals[targetId].priceGEL (server)
      create Payment{ purpose:"deal", userId, businessOwnerId=deal.ownerId,
                      amount, status:"pending" }
      → redirect to Flitt hosted page
  → user pays → Flitt → POST /api/flitt/callback
      verify signature; Payment.status="paid"; applySideEffect()
      case "deal" (idempotent):
        Voucher{ code=generateVoucherCode(), userId, dealId, dealTitle,
                 amountGEL, paymentOrderId, status:"active" }
        Notification{ ownerId=businessOwnerId, type:"deal_purchase",
                      buyerName, buyerEmail, dealTitle, voucherCode,
                      amountGEL, paymentOrderId, read:false }
  → payment result page: show voucher code
  → reservations page "My Deals": list vouchers
  → /admin/notifications: owner sees buyer + code
```

## Error Handling

- Unknown deal id at checkout → 404.
- Not logged in at deal checkout → 401 (client redirects to sign-in first, this is
  the server-side guard).
- Voucher code collision → retry generation against the unique index.
- Duplicate callback → idempotency guard (voucher exists → skip both creates).
- Missing buyer user record → notification stores whatever fields resolve; buyer
  fields fall back to empty strings rather than throwing.

## Testing

No test suite configured. Manual verification:
1. Logged-out Grab → redirected to sign-in.
2. Logged-in Grab → Flitt checkout with server-computed price (tampered client
   amount ignored).
3. Simulate paid callback → voucher created, notification created, both idempotent
   on a second callback.
4. Payment result page shows the code.
5. Reservations "My Deals" lists the voucher.
6. `/admin/notifications` (as the owner) shows buyer + code.

## Out of Scope (YAGNI)

- Redeem action / mark-redeemed UI.
- Email delivery (Resend) — future phase.
- `DealModel` + seed script — deals stay mock.
- Guest vouchers.
- Mark-notification-read action.
- Admin voucher management screen.
