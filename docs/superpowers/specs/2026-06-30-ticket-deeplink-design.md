# Ticket Booking — Deep-link to Official Operators

**Date:** 2026-06-30
**Status:** Approved design, ready for implementation plan

## Goal

The `/[locale]/tickets` page currently renders a "Buy" button that attempts an on-site
Flitt checkout (`purpose: "ticket"`). This cannot produce a *real* transport ticket:
neither Georgian Railway (matarebeli.ge) nor Georgian Bus (georgianbus.com) exposes a
public buy-ticket API, and reselling requires a B2B contract we do not have.

Instead, **send the user to the official operator site to book**. The site keeps its
search/browse UX (tabs, route form, cards, indicative prices) but the action button
opens the operator's website in a new tab. Honest, shippable today, no contract, no
payment risk.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Rail tab | Card button opens `https://www.matarebeli.ge/` (Georgian Railway) in a new tab. |
| Bus tab | Card button opens `https://georgianbus.com/en/` (Georgian Bus) in a new tab. |
| Prefill | **None.** Homepage links only — station-code prefill for matarebeli.ge could not be reliably obtained, and georgianbus.com is a JS form with no URL params. User re-enters the route on the operator site. |
| Transit-pass tab | **Out of scope** this work. Leave existing behavior untouched. |
| On-site payment | Remove the Flitt `payNow({ purpose: "ticket" })` call from the rail/bus buy path. Leave the `ticket` purpose in the checkout route + `PaymentModel` untouched (harmless, may serve a future concierge flow). |
| New deps | None. Two static URLs, a `window.open`, and a lucide icon already available. |
| Seeding | No longer required for rail/bus tickets to "work" — deep-link works on mock data. |

## Architecture

Existing stack unchanged: Next.js 16 App Router, next-intl (`en/ka/ru`), MongoDB/Mongoose,
Tailwind v4 + shadcn (base-ui). The change is confined to one client component plus i18n
message files. No new model, no API change, no migration.

### Affected files

| File | Change |
|------|--------|
| `src/components/site/tickets-search.tsx` | Replace `buy()` (Flitt) with `book()` (open operator URL). Add operator URL map + per-tab button label + external-link icon. Remove `payNow` import + `purpose: "ticket"` usage. |
| `messages/en.json`, `messages/ka.json`, `messages/ru.json` | Add `tickets.bookRail`, `tickets.bookBus` (button labels) and optional `tickets.officialNote`. |

Unchanged: `src/app/[locale]/tickets/page.tsx` (still reads DB → falls back to mock — fine),
`src/app/api/tickets/route.ts`, `src/app/api/flitt/checkout/route.ts` (the `ticket` case
stays), `src/lib/models/payment.ts`, `src/lib/pay.ts`.

## Detailed Design

### 1. Operator URL map

In `tickets-search.tsx`, a module-level constant:

```ts
const OPERATOR_URLS: Record<"rail" | "bus", string> = {
  rail: "https://www.matarebeli.ge/",
  bus: "https://georgianbus.com/en/",
};
```

### 2. `book()` replaces `buy()`

```ts
function book(option: TicketOption) {
  if (option.type === "rail" || option.type === "bus") {
    window.open(OPERATOR_URLS[option.type], "_blank", "noopener,noreferrer");
    return;
  }
  // transit-pass: out of scope — keep whatever it does today (no change).
}
```

- `noopener,noreferrer` — security: prevents the opened tab from accessing `window.opener`.
- Remove the `import { payNow } from "@/lib/pay"` line and the `isDbId` regex / "not yet
  available" toast that gated the old buy path. `toast`/`sonner` import may be dropped if no
  longer used elsewhere in the file (verify before removing).

### 3. Button labels

`TicketCard` (rail/bus) button text comes from the tab/option type:
- `rail` → `t("bookRail")` ("Book on Georgian Railway")
- `bus` → `t("bookBus")` ("Book on Georgian Bus")

Add an `ExternalLink` icon (lucide-react, already a dependency) next to the label to signal
the link leaves the site.

`TransitCard` (transit-pass) is untouched — keeps its current `t("buy")` label and `onBuy`.

### 4. i18n keys

Add to all three message files under the `tickets` namespace:
- `bookRail` — EN "Book on Georgian Railway", KA / RU translated.
- `bookBus` — EN "Book on Georgian Bus", KA / RU translated.
- `officialNote` (optional) — EN "Tickets are booked securely on the official operator's website."

### 5. Optional page note

A single muted line under the search header on `tickets/page.tsx` or inside `TicketsSearch`,
using `tickets.officialNote`, telling the user booking happens on the operator site. Low
priority — include if it reads cleanly.

## Out of Scope / Known Limitations

- **No prefill** — operator opens at its homepage; the user re-selects the route there.
- **No real-time price/availability** — card prices are seeded/mock, indicative only. The
  operator site is the source of truth.
- **Transit-pass / city pass** — untouched this work. No TTC integration.
- **Bus operators other than Georgian Bus** — all bus cards link to georgianbus.com
  regardless of the card's `operator` field. Acceptable: Georgian Bus is the primary
  intercity operator; a per-operator map is a future refinement.
- **No real-ticket validity** — this is referral/deep-link, not resale. The real ticket is
  purchased on the operator site, not here.

## Testing

No test suite configured. Manual verification:
- Visit `/en/tickets`, Rail tab → search a route → card button reads "Book on Georgian
  Railway" with external icon → click opens matarebeli.ge in a new tab.
- Bus tab → button reads "Book on Georgian Bus" → opens georgianbus.com/en/ in a new tab.
- Transit-pass tab → behavior unchanged from before this work.
- Switch locale to `ka` and `ru` → button labels translated.
- No console error from a missing `payNow`/`sonner` import after removal.

## Risks

- **Dangling imports (low):** removing `payNow`/`toast` usage may leave unused imports →
  lint error. Mitigation: remove imports only after confirming no other use in the file.
- **transit-pass regression (low):** the refactor of `buy`→`book` must not change the
  transit-pass path. Mitigation: keep `TransitCard`'s handler wired to the old behavior;
  only rail/bus get the new `window.open`.
