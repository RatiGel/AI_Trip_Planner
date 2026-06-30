# Ticket Deep-link Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the non-functional on-site Flitt "Buy" path for rail/bus tickets with new-tab deep-links to the official operators (matarebeli.ge, georgianbus.com).

**Architecture:** Change confined to one client component (`tickets-search.tsx`) plus the three i18n message files. No new model, no API change, no new dependency. Rail/bus card buttons call `window.open(operatorUrl, "_blank", "noopener,noreferrer")`; transit-pass behavior is untouched.

**Tech Stack:** Next.js 16 App Router, next-intl 4 (`en/ka/ru`), React client component, lucide-react icons, Tailwind v4.

## Global Constraints

- No test suite is configured — verification is **manual** (run `npm run dev`, observe in browser). Do not add a test runner.
- i18n keys MUST be added to all three files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together.
- Import `Link`/`useRouter` etc. from `@/i18n/navigation`, never `next/navigation` (not relevant here — no navigation added, but the rule stands).
- `window.open` for external links MUST pass `"noopener,noreferrer"` (security: blocks `window.opener` access from the opened tab).
- Operator URLs (verbatim): rail `https://www.matarebeli.ge/`, bus `https://georgianbus.com/en/`.
- Transit-pass tab is **out of scope** — its card (`TransitCard`) and handler must behave exactly as before.

---

### Task 1: Add i18n button labels

**Files:**
- Modify: `messages/en.json` (the `tickets` object)
- Modify: `messages/ka.json` (the `tickets` object)
- Modify: `messages/ru.json` (the `tickets` object)

**Interfaces:**
- Produces: translation keys `tickets.bookRail` and `tickets.bookBus`, consumed by `TicketCard` in Task 2.

- [ ] **Step 1: Add keys to `messages/en.json`**

Inside the `"tickets"` object, after the `"buy"` line, add:

```json
    "bookRail": "Book on Georgian Railway",
    "bookBus": "Book on Georgian Bus",
```

- [ ] **Step 2: Add keys to `messages/ka.json`**

Inside the `"tickets"` object, after the `"buy"` line, add:

```json
    "bookRail": "დაჯავშნე საქართველოს რკინიგზაზე",
    "bookBus": "დაჯავშნე Georgian Bus-ზე",
```

- [ ] **Step 3: Add keys to `messages/ru.json`**

Inside the `"tickets"` object, after the `"buy"` line, add:

```json
    "bookRail": "Забронировать на Грузинской железной дороге",
    "bookBus": "Забронировать на Georgian Bus",
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "['en','ka','ru'].forEach(l=>{const t=require('./messages/'+l+'.json').tickets; if(!t.bookRail||!t.bookBus) throw new Error(l+' missing keys')}); console.log('ok')"`
Expected: prints `ok` (no JSON parse error, both keys present in all three).

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ka.json messages/ru.json
git commit -m "i18n(tickets): add bookRail/bookBus operator labels

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Replace Flitt buy with operator deep-link

**Files:**
- Modify: `src/components/site/tickets-search.tsx`

**Interfaces:**
- Consumes: `tickets.bookRail` / `tickets.bookBus` (Task 1).
- Produces: none (terminal — UI behavior change).

**Context — current relevant code in `tickets-search.tsx`:**
- Line 9: `import { payNow } from "@/lib/pay";`
- Line 7: `import { toast } from "sonner";`
- Lines 6: lucide import: `import { ArrowRight, Bus, Clock, Search, Train, Wallet } from "lucide-react";`
- `TicketCard` (lines 21-68): one component used for **both** bus and rail. Button at lines 58-64 renders `{t("buy")}` and calls `onBuy`.
- `TransitCard` (lines 70-99): transit-pass card — **do not modify**. Its button calls `onBuy` with `{t("buy")}`.
- `buy()` (lines 135-146): the function to replace. Currently:

```ts
  async function buy(option: TicketOption) {
    const isDbId = /^[a-f0-9]{24}$/i.test(option.id);
    if (!isDbId) {
      toast.error("This ticket is not yet available for online purchase.");
      return;
    }
    try {
      await payNow({ purpose: "ticket", targetId: option.id, locale });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
```

- Call sites: `onBuy={() => buy(p)}` for transit (line 255), `onBuy={() => buy(o)}` for rail/bus results (line 294).

- [ ] **Step 1: Add the operator URL map**

Near the top of the file, after the `CITIES` constant (line 12), add:

```ts
const OPERATOR_URLS: Record<"rail" | "bus", string> = {
  rail: "https://www.matarebeli.ge/",
  bus: "https://georgianbus.com/en/",
};
```

- [ ] **Step 2: Replace `buy()` with `book()`**

Replace the entire `buy` function (lines 135-146) with:

```ts
  function book(option: TicketOption) {
    if (option.type === "rail" || option.type === "bus") {
      window.open(OPERATOR_URLS[option.type], "_blank", "noopener,noreferrer");
    }
    // transit-pass: out of scope — no action this phase.
  }
```

- [ ] **Step 3: Update the two call sites**

Line 255 (transit): change `onBuy={() => buy(p)}` → `onBuy={() => book(p)}`.
Line 294 (rail/bus results): change `onBuy={() => buy(o)}` → `onBuy={() => book(o)}`.

- [ ] **Step 4: Give `TicketCard` a per-type button label + external icon**

In `TicketCard` (renders rail+bus), the button currently shows `{t("buy")}`. Change it to label by type and add an external-link icon.

Add `ExternalLink` to the lucide import on line 6:

```ts
import { ArrowRight, Bus, Clock, ExternalLink, Search, Train, Wallet } from "lucide-react";
```

In `TicketCard`, derive the label from `option.type` (the `isRail` const already exists at line 23). Replace the button block (lines 58-64):

```tsx
        <button
          onClick={onBuy}
          className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
        >
          {isRail ? t("bookRail") : t("bookBus")}
          <ExternalLink className="size-3.5" />
        </button>
```

(`TransitCard` button stays `{t("buy")}` — untouched.)

- [ ] **Step 5: Remove now-unused imports**

`payNow` is no longer called → remove line 9 `import { payNow } from "@/lib/pay";`.

Check whether `toast` (line 7, `sonner`) is still used anywhere else in the file. Run:
`grep -n "toast" src/components/site/tickets-search.tsx`
- If the only matches are the import line and the two lines inside the old `buy()` (now deleted), remove the `import { toast } from "sonner";` line too.
- If `toast` appears elsewhere, leave the import.

The `locale` variable (lines 105-106) was only used by `payNow`. Run:
`grep -n "locale" src/components/site/tickets-search.tsx`
- If `locale` / `useParams` / `params` now have no remaining use, remove those lines (105-106 `const params`/`locale`, and the `useParams` import on line 4) to avoid lint errors. If still used, leave them.

- [ ] **Step 6: Typecheck / lint**

Run: `npm run lint`
Expected: no errors in `tickets-search.tsx` (specifically no "unused variable" for `payNow`/`toast`/`locale`, no "Cannot find name `book`").

- [ ] **Step 7: Manual verification in browser**

Run: `npm run dev`
Then in the browser:
1. Open `http://localhost:3000/en/tickets`, Rail tab, search Tbilisi→Batumi → a result card button reads **"Book on Georgian Railway"** with an external-link icon → click → new tab opens `https://www.matarebeli.ge/`.
2. Bus tab, search a route → button reads **"Book on Georgian Bus"** → click → new tab opens `https://georgianbus.com/en/`.
3. Transit-pass tab → cards still render with the old "Buy" label; behavior unchanged from before this work (no crash).
4. Switch to `/ka/tickets` and `/ru/tickets` → rail/bus button labels are translated.
5. Browser console: no errors.

Expected: all five pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/site/tickets-search.tsx
git commit -m "feat(tickets): deep-link rail/bus to official operators

Replace the non-functional Flitt buy path with new-tab links to
matarebeli.ge (rail) and georgianbus.com (bus). Transit-pass
untouched. No public ticketing API exists, so booking happens on
the operator site.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Rail → matarebeli.ge ✓ (Task 2 OPERATOR_URLS + book) · Bus → georgianbus.com ✓ · No prefill ✓ (homepage URLs only) · transit-pass untouched ✓ (book() no-ops it, TransitCard unchanged) · remove payNow/ticket buy ✓ (Task 2 Step 2,5) · leave `ticket` purpose in checkout/PaymentModel ✓ (plan never touches them) · button labels per tab + external icon ✓ (Step 4) · i18n all three locales ✓ (Task 1) · `noopener,noreferrer` ✓ (Step 2). Optional `officialNote` page line — dropped (spec marked optional/low-priority; YAGNI). No other gaps.

**Placeholder scan:** No TBD/TODO; every code step shows full code; the two conditional-removal steps (toast/locale) give exact grep commands to decide. No vague "handle errors".

**Type consistency:** `book(option: TicketOption)` matches both call sites `book(p)`/`book(o)` (both `TicketOption`). `OPERATOR_URLS` keyed `"rail"|"bus"`, indexed only inside the `option.type === "rail" || "bus"` guard → type-safe. `isRail` already defined in `TicketCard` scope (line 23) — reused in Step 4. `ExternalLink` added to import before use.
