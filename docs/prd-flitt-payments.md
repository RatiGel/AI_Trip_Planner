# PRD — Flitt Payments Integration

Status: Draft · Owner: platform · Date: 2026-06-16

## 1. Summary

Add online payments to the AI Trip Planner using **Flitt** (Georgian payment
gateway) hosted checkout. Single platform merchant collects all funds; payouts
to businesses are handled manually off-platform. Two product surfaces:

1. **Listing publication fee** — businesses pay **50 GEL per listing (one-time)**
   to publish a place. Until paid, the place stays unpublished/hidden.
2. **Tourist purchases (one-time)** — tourists pay for:
   - **Reservations** at a business (amount set per place by the business)
   - **Transit tickets** (price from `TicketModel.priceGEL`)
   - **Generic services/products** a business defines on its listing

## 2. Goals / Non-goals

**Goals**
- Hosted Flitt checkout (redirect) — no raw card data touches our servers (PCI SAQ-A).
- Server-side signature generation + webhook signature verification (SHA1).
- Idempotent callback handling; payments survive duplicate webhook delivery.
- Single source of truth: a `Payment` record per checkout, linked to its target.
- Currency: **GEL** only. Amounts stored in **minor units (tetri)** — 50 GEL = 5000.

**Non-goals (this phase)**
- Split payments / per-business sub-merchants (manual payout for now).
- Refunds/reversals UI (API supports it; defer to a follow-up).
- Saved cards / recurring billing / true subscriptions (all purchases are one-time).
- Email receipts (Resend — separate phase).

## 3. Credentials & config

`.env.local` (never commit; rotate after this session — keys were pasted in chat):

```
FLITT_MERCHANT_ID=4057181
FLITT_PAYMENT_KEY=...        # payment key — signs checkout + verifies callbacks
FLITT_CREDIT_KEY=...         # credit/payout private key — refunds/reversals (later phase)
NEXT_PUBLIC_APP_URL=https://<domain>   # for callback + response URLs
```

> `FLITT_PAYMENT_KEY` is the secret used in the SHA1 signature. `FLITT_CREDIT_KEY`
> is only for reverse/credit operations — not used in checkout or callback verify.

## 4. Flitt API (from flitt-payments-skill)

### Signature (SHA1)
1. `data = [secret_key]`
2. Append param values, keys sorted alphabetically, skipping `""`, `null`,
   and the `signature` key itself. `0` is kept.
3. `sha1( data.join("|") ).hexdigest()` — lowercase hex.

### Create checkout
`POST https://pay.flitt.com/api/checkout/url`
```json
{ "request": {
  "order_id": "...", "merchant_id": 4057181, "order_desc": "...",
  "amount": 5000, "currency": "GEL", "signature": "...",
  "server_callback_url": "<APP_URL>/api/flitt/callback",
  "response_url": "<APP_URL>/<locale>/payment/result?order_id=..."
}}
```
Success → `response.checkout_url` (redirect browser there). Store `payment_id` if present.

### Callback (webhook)
Flat JSON POST to `server_callback_url`. Verify signature the same way
(exclude `signature` + `response_signature_string`, omit empty/null, sort, join `|`, SHA1).
Success = `response_status:"success"` AND `order_status:"approved"`.
Idempotent on `order_id`. Return `200` only after local accept.

## 5. Data model — new `Payment` collection

```
Payment {
  _id
  orderId: string         // our id, sent as Flitt order_id, unique
  flittPaymentId?: string // from response/callback
  purpose: "listing_fee" | "reservation" | "ticket" | "service"
  targetId: string        // placeId | reservationId | ticketId | service id
  userId: string          // payer (session user)
  businessOwnerId?: string// for payout accounting (place.ownerId)
  amount: number          // minor units (tetri)
  currency: "GEL"
  status: "pending" | "paid" | "failed"
  rawCallback?: object     // last webhook payload (audit)
  createdAt, updatedAt
}
```

Side-effects on `status -> paid` (in callback, idempotent):
- `listing_fee`  → `Place.status = "active"`, set `Place.paid = true`
- `reservation`  → `Reservation.status = "confirmed"`
- `ticket`       → mark ticket purchase owned by user (new `TicketPurchase` or flag)
- `service`      → mark service order fulfilled

## 6. Schema changes
- `Place`: add `paid: boolean (default false)`. New places by businesses start
  `status:"pending"` until listing fee paid. (Superadmin-created stay `active`.)
- `Place`: add `services: [{ _id, name, nameKa, priceGEL, description }]` for generic purchases.
- `Reservation`: add `priceGEL?: number`, `paymentStatus: "unpaid"|"paid"` (default unpaid).

## 7. Routes / surfaces
- `POST /api/flitt/checkout` — body `{ purpose, targetId }`. Auth required.
  Computes amount server-side (never trust client amount), creates `Payment`
  (pending), builds signature, calls Flitt, returns `{ checkout_url }`.
- `POST /api/flitt/callback` — webhook. Verify sig → update `Payment` + side-effect.
- `GET  /[locale]/payment/result` — user-facing return page; reads `order_id`, shows status.

## 8. Security
- Amount + currency derived server-side from the target record, never from client.
- Webhook signature verified before any state change; reject mismatch with `400`.
- Idempotency: callback no-ops if `Payment.status` already terminal.
- Secrets server-only (no `NEXT_PUBLIC_` on keys).
- Rotate the pasted keys.

## 9. Acceptance criteria
- Business publishes a place → redirected to Flitt → pays 50 GEL → place goes `active`.
- Tourist books reservation with price → pays → reservation `confirmed` + `paid`.
- Tourist buys transit ticket → pays → ownership recorded.
- Tourist buys a generic service → pays → order recorded.
- Duplicate webhook does not double-apply side-effects.
- Tampered callback signature is rejected.
