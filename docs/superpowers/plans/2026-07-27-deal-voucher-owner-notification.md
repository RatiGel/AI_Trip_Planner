# Deal Voucher + Owner Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A logged-in user buys a deal; on payment success a voucher code is generated and shown to the buyer (payment result + reservations pages), and the business owner who listed the deal gets an in-app notification with the buyer's info and the voucher code.

**Architecture:** Deals stay mock data (`src/lib/mock/deals.ts`), now carrying an `ownerEmail`. Two new Mongoose models (`Voucher`, `Notification`) persist purchase artifacts. The Flitt checkout route is hardened to require login and compute the deal price server-side. The Flitt callback route gains a `deal` side-effect that creates the voucher + notification idempotently. Buyer sees the code on the payment result page and a new "My Deals" section on the reservations page; the owner sees notifications at `/admin/notifications`.

**Tech Stack:** Next.js 16 App Router (`[locale]` i18n, next-intl 4), Mongoose/MongoDB, NextAuth v5, TypeScript, Tailwind v4, Node `crypto`.

## Global Constraints

- Next.js 16: `params`/`searchParams` in page props are Promises — always `await`.
- Import `Link`, `useRouter`, `redirect`, `usePathname` from `@/i18n/navigation`, never from `next/navigation` (except `useParams`/`usePathname` read-only in existing client patterns).
- Server components: `await connectDB()` before any model query; get user via `const session = await auth()` then `(session.user as { id?: string }).id`.
- i18n: add any new UI string to all three message files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together.
- Prices: `priceGEL` is in GEL; Flitt `amount` is in minor units (tetri) = `Math.round(gel * 100)`.
- No automated test suite exists. Each task's verification is a typecheck (`npx tsc --noEmit`) plus `npm run lint`, and manual steps where noted. Never introduce a test runner.
- Money must never be trusted from the client: the deal price is resolved server-side from `mockDeals`.
- Deal ids are mock strings (`deal-1`…). Owner identity is a stable email on the mock deal, resolved to a `UserModel._id` server-side.

---

## File Structure

**Create:**
- `src/lib/models/voucher.ts` — `Voucher` model.
- `src/lib/models/notification.ts` — `Notification` model.
- `src/lib/voucher.ts` — `generateVoucherCode()` + `createUniqueVoucher()` helper.
- `src/app/[locale]/admin/notifications/page.tsx` — owner notifications page.
- `src/components/site/deal-vouchers.tsx` — "My Deals" section (server-friendly, plain render) for the reservations page.

**Modify:**
- `src/types/index.ts` — add `ownerEmail` to `DealOption`; add `Voucher`, `Notification` types.
- `src/lib/mock/deals.ts` — add `ownerEmail` to each deal.
- `src/app/api/flitt/checkout/route.ts` — harden the `deal` branch.
- `src/app/api/flitt/callback/route.ts` — add `case "deal"` side effect.
- `src/components/site/deals-grid.tsx` — require login before `payNow`.
- `src/app/[locale]/payment/result/page.tsx` — show voucher code for paid deals.
- `src/app/[locale]/reservations/page.tsx` — render the "My Deals" section.
- `src/components/admin/sidebar.tsx` — add notifications nav item.
- `messages/en.json`, `messages/ka.json`, `messages/ru.json` — new keys.

---

## Task 1: Voucher model

**Files:**
- Create: `src/lib/models/voucher.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `VoucherModel` (Mongoose model) with document interface `IVoucher`; TS type `Voucher` in `@/types`.
  - `IVoucher` fields: `code: string` (unique), `userId: string`, `dealId: string`, `dealTitle: string`, `amountGEL: number`, `paymentOrderId: string` (unique), `status: "active" | "redeemed"`, `createdAt: Date`, `updatedAt: Date`.

- [ ] **Step 1: Create the model file**

Create `src/lib/models/voucher.ts` (follows the `payment.ts` pattern, including the dev hot-reload cache drop so schema/index changes take effect):

```ts
import mongoose, { Schema, model, models } from "mongoose";

export type VoucherStatus = "active" | "redeemed";

export interface IVoucher {
  _id: mongoose.Types.ObjectId;
  code: string; // human-readable, e.g. DEAL-A3F9-K2M1
  userId: string; // buyer
  dealId: string; // mock deal id snapshot (deal-1)
  dealTitle: string; // snapshot
  amountGEL: number; // snapshot, in GEL
  paymentOrderId: string; // links to the Payment row (unique → idempotency)
  status: VoucherStatus;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    dealId: { type: String, required: true },
    dealTitle: { type: String, required: true },
    amountGEL: { type: Number, required: true, min: 0 },
    paymentOrderId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "redeemed"], default: "active" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

VoucherSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema/index changes take effect.
if (models.Voucher) delete models.Voucher;
export const VoucherModel = model<IVoucher>("Voucher", VoucherSchema);
```

- [ ] **Step 2: Add the TS type**

In `src/types/index.ts`, after the `Reservation` interface (around line 289), add:

```ts
export interface Voucher {
  id: string;
  code: string;
  userId: string;
  dealId: string;
  dealTitle: string;
  amountGEL: number;
  paymentOrderId: string;
  status: "active" | "redeemed";
  createdAt: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/models/voucher.ts src/types/index.ts
git commit -m "feat(deals): add Voucher model and type"
```

---

## Task 2: Notification model

**Files:**
- Create: `src/lib/models/notification.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `NotificationModel` with `INotification`; TS type `Notification` in `@/types`.
  - `INotification` fields: `ownerId: string`, `type: "deal_purchase"`, `dealId: string`, `dealTitle: string`, `voucherCode: string`, `buyerName: string`, `buyerEmail: string`, `amountGEL: number`, `paymentOrderId: string` (unique), `read: boolean`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Create the model file**

Create `src/lib/models/notification.ts`:

```ts
import mongoose, { Schema, model, models } from "mongoose";

export type NotificationType = "deal_purchase";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  ownerId: string; // business owner who receives it
  type: NotificationType;
  dealId: string;
  dealTitle: string;
  voucherCode: string;
  buyerName: string;
  buyerEmail: string;
  amountGEL: number;
  paymentOrderId: string; // unique → idempotency with the voucher
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    ownerId: { type: String, required: true, index: true },
    type: { type: String, enum: ["deal_purchase"], default: "deal_purchase" },
    dealId: { type: String, required: true },
    dealTitle: { type: String, required: true },
    voucherCode: { type: String, required: true },
    buyerName: { type: String, default: "" },
    buyerEmail: { type: String, default: "" },
    amountGEL: { type: Number, required: true, min: 0 },
    paymentOrderId: { type: String, required: true, unique: true, index: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

NotificationSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema/index changes take effect.
if (models.Notification) delete models.Notification;
export const NotificationModel = model<INotification>("Notification", NotificationSchema);
```

- [ ] **Step 2: Add the TS type**

In `src/types/index.ts`, after the `Voucher` interface added in Task 1, add:

```ts
export interface Notification {
  id: string;
  ownerId: string;
  type: "deal_purchase";
  dealId: string;
  dealTitle: string;
  voucherCode: string;
  buyerName: string;
  buyerEmail: string;
  amountGEL: number;
  paymentOrderId: string;
  read: boolean;
  createdAt: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/models/notification.ts src/types/index.ts
git commit -m "feat(deals): add Notification model and type"
```

---

## Task 3: Voucher code generator

**Files:**
- Create: `src/lib/voucher.ts`

**Interfaces:**
- Consumes: `VoucherModel` from Task 1.
- Produces:
  - `generateVoucherCode(): string` → format `DEAL-XXXX-XXXX` (unambiguous uppercase alphanumeric).
  - `createUniqueVoucher(input: { userId: string; dealId: string; dealTitle: string; amountGEL: number; paymentOrderId: string }): Promise<IVoucher>` — creates a voucher, retrying code generation on a duplicate-`code` collision. Relies on the unique `paymentOrderId` index for cross-call idempotency (caller handles the duplicate-order case).

- [ ] **Step 1: Create the helper file**

Create `src/lib/voucher.ts`:

```ts
import { randomInt } from "crypto";
import { VoucherModel, type IVoucher } from "@/lib/models/voucher";

// No 0/O, 1/I/L — unambiguous when read aloud or typed.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function segment(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Human-readable voucher code, e.g. DEAL-A3F9-K2M1. */
export function generateVoucherCode(): string {
  return `DEAL-${segment(4)}-${segment(4)}`;
}

interface VoucherInput {
  userId: string;
  dealId: string;
  dealTitle: string;
  amountGEL: number;
  paymentOrderId: string;
}

/**
 * Create a voucher, retrying on a duplicate-code collision (rare). Assumes the
 * caller has already checked there is no voucher for this paymentOrderId; the
 * unique paymentOrderId index is the final idempotency backstop.
 */
export async function createUniqueVoucher(input: VoucherInput): Promise<IVoucher> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await VoucherModel.create({ ...input, code: generateVoucherCode() });
      return doc.toObject() as IVoucher;
    } catch (e) {
      // Duplicate key: 11000. If it's the code, retry; if it's paymentOrderId, rethrow.
      const err = e as { code?: number; keyPattern?: Record<string, unknown> };
      if (err.code === 11000 && err.keyPattern && "code" in err.keyPattern) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique voucher code after 5 attempts");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual sanity-check the code format**

Run: `npx tsx -e "import('./src/lib/voucher.ts').then(m => { for (let i=0;i<5;i++) console.log(m.generateVoucherCode()); })"`
Expected: five lines like `DEAL-A3F9-K2M1`, all matching `^DEAL-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$`, no `0/O/1/I/L`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/voucher.ts
git commit -m "feat(deals): add voucher code generator"
```

---

## Task 4: Add ownerEmail to mock deals

**Files:**
- Modify: `src/types/index.ts` (the `DealOption` interface)
- Modify: `src/lib/mock/deals.ts`

**Interfaces:**
- Produces: `DealOption.ownerEmail: string` — the email of the `UserModel` owner of the deal; resolved to a user id server-side in Task 5.

- [ ] **Step 1: Add the field to the type**

In `src/types/index.ts`, add to the `DealOption` interface (after `id: string;`):

```ts
  /** Email of the business-owner UserModel that listed this deal; resolved to userId server-side. */
  ownerEmail: string;
```

- [ ] **Step 2: Set an owner on every mock deal**

In `src/lib/mock/deals.ts`, add `ownerEmail` to each of `deal-1`…`deal-6`. Use an email that maps to a real `UserModel` in your DB. If unsure which exists, run:

`npx tsx --env-file=.env.local -e "import('./src/lib/db.ts').then(async ({connectDB}) => { await connectDB(); const {UserModel} = await import('./src/lib/models/user.ts'); const us = await UserModel.find({ role: { \$in: ['business','admin','superadmin'] } }).select('email role').lean(); console.log(us); process.exit(0); })"`

Pick one or more of the returned emails. Example edit for `deal-1` (repeat for all six, distributing across owners as you like):

```ts
  {
    id: "deal-1",
    ownerEmail: "owner@example.com", // ← replace with a real business-owner email from your DB
    title: "Narikala Fortress Entry",
    // …unchanged fields…
  },
```

If no business/admin user exists yet, create one via the sign-up flow (or promote a user) and use that email. The owner must exist so notifications have a real `ownerId`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (every `DealOption` literal now has `ownerEmail`).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/mock/deals.ts
git commit -m "feat(deals): tag mock deals with owner email"
```

---

## Task 5: Harden the deal checkout

**Files:**
- Modify: `src/app/api/flitt/checkout/route.ts`

**Interfaces:**
- Consumes: `mockDeals` (`@/lib/mock/deals`), `UserModel` (`@/lib/models/user`).
- Produces: the `deal` branch of `resolve()` now returns a server-computed amount and `businessOwnerId`, and requires login. `resolve()`'s success shape is unchanged (`{ amount, desc, businessOwnerId? }`).

- [ ] **Step 1: Import the deal source and user model**

At the top of `src/app/api/flitt/checkout/route.ts`, add imports alongside the existing ones:

```ts
import { mockDeals } from "@/lib/mock/deals";
import { UserModel } from "@/lib/models/user";
```

- [ ] **Step 2: Require login for deals**

Change the guard that currently exempts deals. Replace:

```ts
  // Deals are public — guests may buy. All other purposes require login.
  const session = await auth();
  if (!session?.user && body.purpose !== "deal") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
```

with:

```ts
  // All purposes (including deals) require login — a voucher is keyed to the buyer.
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
```

- [ ] **Step 3: Resolve the deal price + owner server-side**

Replace the entire `case "deal": { … }` block in `resolve()` with:

```ts
    case "deal": {
      const deal = mockDeals.find((d) => d.id === body.targetId);
      if (!deal) return { error: "Deal not found", status: 404 };
      if (!deal.priceGEL || deal.priceGEL <= 0) return { error: "Deal has no valid price", status: 400 };
      // Resolve owner email → user id so the notification later targets a real owner.
      const owner = await UserModel.findOne({ email: deal.ownerEmail })
        .select("_id")
        .lean<{ _id: unknown }>();
      return {
        amount: Math.round(deal.priceGEL * 100),
        desc: `Deal: ${deal.title}`,
        businessOwnerId: owner ? String(owner._id) : undefined,
      };
    }
```

(The client-supplied `amount`/`desc` on `Body` are now ignored for deals; leave the fields on the interface — the client still sends them harmlessly.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification (price tamper is ignored)**

Start the dev server (`npm run dev`), sign in, then in the browser console on `/en/deals`:

```js
await fetch("/api/flitt/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose: "deal", targetId: "deal-1", amount: 1, locale: "en" }) }).then(r => r.json())
```

Expected: a `checkout_url` is returned. Then check MongoDB: the newest `payments` doc for `deal-1` has `amount: 1200` (12 GEL), **not** 100 — proving the client amount was ignored. Also confirm a logged-out call returns `{ error: "Unauthorized" }` with status 401.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/flitt/checkout/route.ts
git commit -m "fix(deals): require login and resolve deal price server-side"
```

---

## Task 6: Generate voucher + notification on payment

**Files:**
- Modify: `src/app/api/flitt/callback/route.ts`

**Interfaces:**
- Consumes: `createUniqueVoucher` (Task 3), `NotificationModel` (Task 2), `VoucherModel` (Task 1), `UserModel`, `mockDeals`.
- Produces: a `case "deal"` in `applySideEffect()` that creates one `Voucher` and one `Notification` per paid deal payment, idempotently.

- [ ] **Step 1: Add imports**

At the top of `src/app/api/flitt/callback/route.ts`, add:

```ts
import { VoucherModel } from "@/lib/models/voucher";
import { NotificationModel } from "@/lib/models/notification";
import { UserModel } from "@/lib/models/user";
import { createUniqueVoucher } from "@/lib/voucher";
import { mockDeals } from "@/lib/mock/deals";
```

- [ ] **Step 2: Add the deal side effect**

In `applySideEffect()`, add a `case "deal"` before the `default`/closing brace of the switch (after the `ticket`/`service` case):

```ts
    case "deal": {
      // Idempotency: callbacks may fire more than once. The Voucher's unique
      // paymentOrderId index is the backstop; check first to avoid noisy errors.
      const existing = await VoucherModel.findOne({ paymentOrderId: payment.orderId })
        .select("_id")
        .lean();
      if (existing) break;
      if (!payment.userId) break; // deals require login; nothing to key a voucher to

      const deal = mockDeals.find((d) => d.id === payment.targetId);
      const dealTitle = deal?.title ?? "Deal";
      const amountGEL = Math.round(payment.amount) / 100;

      const voucher = await createUniqueVoucher({
        userId: payment.userId,
        dealId: payment.targetId,
        dealTitle,
        amountGEL,
        paymentOrderId: payment.orderId,
      });

      const buyer = await UserModel.findById(payment.userId)
        .select("name email")
        .lean<{ name?: string; email?: string }>();

      if (payment.businessOwnerId) {
        await NotificationModel.create({
          ownerId: payment.businessOwnerId,
          type: "deal_purchase",
          dealId: payment.targetId,
          dealTitle,
          voucherCode: voucher.code,
          buyerName: buyer?.name ?? "",
          buyerEmail: buyer?.email ?? "",
          amountGEL,
          paymentOrderId: payment.orderId,
        }).catch((e: unknown) => {
          // Duplicate notification (11000) is fine under re-delivery; rethrow others.
          const err = e as { code?: number };
          if (err.code !== 11000) throw e;
        });
      }
      break;
    }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification (voucher + notification created once)**

With the dev server running and a signed-in buyer, complete a deal purchase through the real Flitt sandbox flow (Grab → pay). After the callback fires, check MongoDB:
- `vouchers`: one new doc with a `DEAL-XXXX-XXXX` code, the buyer's `userId`, `dealId`, `dealTitle`, `amountGEL`, and `status: "active"`.
- `notifications`: one new doc with `ownerId` = the deal owner's user id, the same `voucherCode`, and the buyer's name/email.

Then simulate a duplicate callback (re-POST the same payload to `/api/flitt/callback`, or trigger Flitt to resend): confirm **no** second voucher or notification is created (counts unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/flitt/callback/route.ts
git commit -m "feat(deals): generate voucher and owner notification on paid deal"
```

---

## Task 7: Require login on the Grab button

**Files:**
- Modify: `src/components/site/deals-grid.tsx`

**Interfaces:**
- Consumes: `useSession` from `next-auth/react`, `useRouter` from `@/i18n/navigation`.
- Produces: `grab()` redirects unauthenticated users to `/login` (with a callback back to `/deals`) instead of calling `payNow`.

- [ ] **Step 1: Add session + router hooks**

In `src/components/site/deals-grid.tsx`, extend the imports:

```ts
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
```

Inside `DealCard`, after the existing hooks (`const [loading, setLoading] = useState(false);`), add:

```ts
  const { status } = useSession();
  const router = useRouter();
```

- [ ] **Step 2: Guard `grab()`**

At the very top of `grab()` (before `setLoading(true)`), add:

```ts
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/${locale}/deals`);
      return;
    }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Logged out on `/en/deals`, click Grab → redirected to the login page. Log in, return to `/en/deals`, click Grab → proceeds to Flitt as before.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/deals-grid.tsx
git commit -m "feat(deals): require login before grabbing a deal"
```

---

## Task 8: Show voucher code on the payment result page

**Files:**
- Modify: `src/app/[locale]/payment/result/page.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `VoucherModel` (Task 1); the payment doc now also selects `purpose` and `orderId`.
- Produces: when `status === "paid"` and `purpose === "deal"`, the page renders the voucher code below the message.

- [ ] **Step 1: Add i18n keys**

Add to the `payment` namespace in all three message files (translate `ka`/`ru` appropriately):

`messages/en.json` `payment`:
```json
  "voucherLabel": "Your voucher code",
  "voucherHint": "Show this code at the venue to redeem your deal."
```
`messages/ka.json` `payment`:
```json
  "voucherLabel": "თქვენი ვაუჩერის კოდი",
  "voucherHint": "წარადგინეთ ეს კოდი ადგილზე შეთავაზების გამოსაყენებლად."
```
`messages/ru.json` `payment`:
```json
  "voucherLabel": "Ваш код ваучера",
  "voucherHint": "Покажите этот код на месте, чтобы воспользоваться предложением."
```

- [ ] **Step 2: Query the voucher and render it**

In `src/app/[locale]/payment/result/page.tsx`, import the model and widen the payment select. Replace:

```ts
import { PaymentModel } from "@/lib/models/payment";
```
with:
```ts
import { PaymentModel } from "@/lib/models/payment";
import { VoucherModel } from "@/lib/models/voucher";
```

Change the payment lookup to also read `purpose`:

```ts
  let status: "pending" | "paid" | "failed" | "unknown" = "unknown";
  let voucherCode: string | null = null;
  if (order_id) {
    await connectDB();
    const payment = await PaymentModel.findOne({ orderId: order_id })
      .select("status purpose")
      .lean<{ status: "pending" | "paid" | "failed"; purpose: string }>();
    if (payment) {
      status = payment.status;
      if (payment.status === "paid" && payment.purpose === "deal") {
        const voucher = await VoucherModel.findOne({ paymentOrderId: order_id })
          .select("code")
          .lean<{ code: string }>();
        voucherCode = voucher?.code ?? null;
      }
    }
  }
```

Then, in the JSX, add a voucher block after the `<p>{message}</p>` line and before the `<Link>`:

```tsx
      {voucherCode && (
        <div
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("voucherLabel")}
          </p>
          <p className="mt-2 select-all font-mono text-2xl font-bold tracking-widest text-foreground">
            {voucherCode}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("voucherHint")}</p>
        </div>
      )}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

After a paid deal purchase, land on `/en/payment/result?order_id=deal_…`. Expected: the ✅ heading plus a card showing `Your voucher code` and the `DEAL-XXXX-XXXX` value. Visit the same URL for a paid **reservation** order → no voucher card (purpose gate works).

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/payment/result/page.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(deals): show voucher code on payment result page"
```

---

## Task 9: "My Deals" section on the reservations page

**Files:**
- Create: `src/components/site/deal-vouchers.tsx`
- Modify: `src/app/[locale]/reservations/page.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `VoucherModel` (Task 1).
- Produces: `<DealVouchers vouchers={…} labels={…} />` — a presentational component rendering a list of voucher cards. Props:
  - `vouchers: { id: string; code: string; dealTitle: string; amountGEL: number; status: string; createdAt: string }[]`
  - `labels: { heading: string; active: string; redeemed: string; codeLabel: string }`

- [ ] **Step 1: Add i18n keys**

Add a new `deals` sub-object for reservations, plus reuse. Add to each file under a new top-level namespace `myDeals`:

`messages/en.json`:
```json
  "myDeals": {
    "heading": "My Deals",
    "codeLabel": "Code",
    "active": "Active",
    "redeemed": "Redeemed"
  }
```
`messages/ka.json`:
```json
  "myDeals": {
    "heading": "ჩემი შეთავაზებები",
    "codeLabel": "კოდი",
    "active": "აქტიური",
    "redeemed": "გამოყენებული"
  }
```
`messages/ru.json`:
```json
  "myDeals": {
    "heading": "Мои предложения",
    "codeLabel": "Код",
    "active": "Активен",
    "redeemed": "Использован"
  }
```

- [ ] **Step 2: Create the presentational component**

Create `src/components/site/deal-vouchers.tsx`:

```tsx
import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface VoucherView {
  id: string;
  code: string;
  dealTitle: string;
  amountGEL: number;
  status: string;
  createdAt: string;
}

export interface VoucherLabels {
  heading: string;
  active: string;
  redeemed: string;
  codeLabel: string;
}

export function DealVouchers({
  vouchers,
  labels,
}: {
  vouchers: VoucherView[];
  labels: VoucherLabels;
}) {
  if (!vouchers.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{labels.heading}</h2>
      <div className="mt-4 space-y-4">
        {vouchers.map((v) => (
          <div
            key={v.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-base font-semibold">{v.dealTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.codeLabel}:{" "}
                  <span className="select-all font-mono font-bold tracking-widest text-foreground">
                    {v.code}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">₾ {v.amountGEL}</span>
              <Badge variant={v.status === "redeemed" ? "outline" : "default"}>
                {v.status === "redeemed" ? labels.redeemed : labels.active}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Query vouchers and render the section**

In `src/app/[locale]/reservations/page.tsx`:

Add imports:
```ts
import { getTranslations } from "next-intl/server";
import { VoucherModel } from "@/lib/models/voucher";
import { DealVouchers, type VoucherView } from "@/components/site/deal-vouchers";
```

After the existing `reservations` mapping (after line ~72, before the empty-state check), fetch vouchers and build labels:

```ts
  const rawVouchers = await VoucherModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<{ _id: unknown; code: string; dealTitle: string; amountGEL: number; status: string; createdAt: Date }[]>();
  const vouchers: VoucherView[] = rawVouchers.map((v) => ({
    id: String(v._id),
    code: v.code,
    dealTitle: v.dealTitle,
    amountGEL: v.amountGEL,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
  }));

  const td = await getTranslations({ locale, namespace: "myDeals" });
  const voucherLabels = {
    heading: td("heading"),
    active: td("active"),
    redeemed: td("redeemed"),
    codeLabel: td("codeLabel"),
  };
```

Update the empty-state guard so a user with vouchers but no reservations still sees their deals. Replace:

```ts
  if (!reservations.length) {
```
with:
```ts
  if (!reservations.length && !vouchers.length) {
```

In the empty-state early return's JSX, add the deals section so vouchers show even when there are zero reservations — but since that branch only runs when `vouchers.length === 0`, no change is needed there.

Render the section inside the main return. Add `<DealVouchers vouchers={vouchers} labels={voucherLabels} />` just before the closing `</div>` of the main container (after the reservations list `</div>`):

```tsx
      <DealVouchers vouchers={vouchers} labels={voucherLabels} />
    </div>
```

Also handle the case where there are vouchers but no reservations: the reservations-list block renders `{reservations.length}` in the header and maps an empty array harmlessly, so the main return works with zero reservations. To avoid a misleading "0 reservations" header when only vouchers exist, wrap the reservations header + list in `{reservations.length > 0 && ( … )}`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

As a buyer who has purchased a deal, open `/en/reservations`. Expected: a "My Deals" section listing the deal title, `Code: DEAL-XXXX-XXXX`, amount, and an "Active" badge. A user with only a deal (no place reservations) still sees "My Deals" and no misleading reservations header. A user with neither sees the original empty state.

- [ ] **Step 6: Commit**

```bash
git add src/components/site/deal-vouchers.tsx src/app/\[locale\]/reservations/page.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(deals): show purchased vouchers in My Deals on reservations page"
```

---

## Task 10: Admin notifications page

**Files:**
- Create: `src/app/[locale]/admin/notifications/page.tsx`
- Modify: `src/components/admin/sidebar.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `NotificationModel` (Task 2), `auth`, `connectDB`.
- Produces: `/admin/notifications` route showing the logged-in owner's notifications; a sidebar nav entry with label key `admin.notifications`.

- [ ] **Step 1: Add i18n keys**

Add a `notifications` key to the `admin` namespace in all three files (used as the sidebar label):

`messages/en.json` `admin`: `"notifications": "Notifications"`
`messages/ka.json` `admin`: `"notifications": "შეტყობინებები"`
`messages/ru.json` `admin`: `"notifications": "Уведомления"`

- [ ] **Step 2: Add the sidebar nav item**

In `src/components/admin/sidebar.tsx`, add `Bell` to the `lucide-react` import list, and add a `NAV` entry after the reservations entry:

```ts
  { href: "/admin/notifications", label: "notifications", Icon: Bell, exact: false },
```

- [ ] **Step 3: Create the page**

Create `src/app/[locale]/admin/notifications/page.tsx`:

```tsx
import { Bell } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { NotificationModel } from "@/lib/models/notification";
import { Badge } from "@/components/ui/badge";

type NotifDoc = {
  _id: unknown;
  dealTitle: string;
  voucherCode: string;
  buyerName: string;
  buyerEmail: string;
  amountGEL: number;
  read: boolean;
  createdAt: Date;
};

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const session = await auth();
  const ownerId = (session?.user as { id?: string } | undefined)?.id ?? "";

  await connectDB();
  const raw = ownerId
    ? await NotificationModel.find({ ownerId })
        .sort({ createdAt: -1 })
        .lean<NotifDoc[]>()
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("notifications")}</h1>
      {raw.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <Bell className="mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {raw.map((n) => (
            <div
              key={String(n._id)}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{n.dealTitle}</p>
                  {!n.read && <Badge variant="default">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {n.buyerName || "Guest"}
                  {n.buyerEmail ? ` · ${n.buyerEmail}` : ""}
                </p>
                <p className="text-sm">
                  Code:{" "}
                  <span className="select-all font-mono font-bold tracking-widest">
                    {n.voucherCode}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">₾ {n.amountGEL}</span>
                <span>{n.createdAt.toLocaleString("en-GB")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Sign in as the business-owner user whose email is on the purchased deal, open `/en/admin/notifications`. Expected: a card per deal purchase showing deal title, buyer name/email, `Code: DEAL-XXXX-XXXX`, amount, timestamp, and a "New" badge. Sign in as a different user → their (empty or different) list, confirming the `ownerId` scope. Confirm the sidebar shows the "Notifications" item with a bell icon.

- [ ] **Step 6: Commit**

```bash
git add src/app/\[locale\]/admin/notifications/page.tsx src/components/admin/sidebar.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(deals): add admin notifications page for deal purchases"
```

---

## Final Verification

- [ ] **Full typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass.

- [ ] **End-to-end manual walkthrough**

1. Logged out → `/en/deals` → Grab → redirected to login.
2. Log in as a tourist → Grab `deal-1` → Flitt → pay.
3. Payment result page shows the voucher code.
4. `/en/reservations` → "My Deals" lists the voucher (Active).
5. MongoDB: exactly one `vouchers` + one `notifications` doc for that order; re-delivering the callback creates no duplicates.
6. Log in as the deal's owner → `/en/admin/notifications` shows buyer name/email + voucher code.
7. Tampered checkout amount is ignored (server price used).

---

## Spec Coverage Check

- Voucher model → Task 1. Notification model → Task 2. Code gen → Task 3.
- `ownerEmail` on mock deals → Task 4 (design said `ownerId`; implemented as stable `ownerEmail` resolved to `ownerId` server-side, since owner ObjectIds aren't known at code time).
- Checkout hardening (login required, server price, owner) → Task 5.
- Callback side effect (voucher + notification, idempotent) → Task 6.
- Grab requires login → Task 7.
- Voucher on payment result → Task 8.
- "My Deals" on reservations → Task 9.
- Admin notifications page + nav → Task 10.
- i18n across en/ka/ru → Tasks 8, 9, 10.
- Out of scope (redeem UI, email, DealModel/seed, guest vouchers, mark-read) → not implemented, per spec.
