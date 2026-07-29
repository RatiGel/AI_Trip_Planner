import { MapPin, Store, Ticket, User } from "lucide-react";
import { mockDeals } from "@/lib/mock/deals";
import { voucherValidUntil } from "@/lib/voucher-validity";

/** Brand shown on every issued pass. */
export const PASS_BRAND = "Explorer PASS";
/** Site the pass was purchased on. */
export const PASS_ISSUER = "Explore Tbilisi";

export interface ExplorerPassData {
  id: string;
  code: string;
  dealId: string;
  dealTitle: string;
  amountGEL: number;
  status: string;
  /** ISO purchase date. */
  createdAt: string;
  /** ISO expiry date; derived from createdAt when the voucher predates the field. */
  validUntil?: string;
  buyerName?: string;
  buyerEmail?: string;
  /** Holder named on the pass; may differ from the buyer when gifted. */
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientAge?: number;
  businessName?: string;
  businessAddress?: string;
  /** Short customer-facing order number, e.g. 100237. */
  orderNo?: number;
  /**
   * Whether the pass is past its validity date. Computed by the caller (a
   * server component) rather than here, so rendering stays pure — reading the
   * clock during render would give unstable results across re-renders.
   */
  expired?: boolean;
}

/** Pass is past its validity date. Call from a server component, not during render. */
export function isPassExpired(pass: {
  status: string;
  createdAt: string;
  validUntil?: string;
}): boolean {
  if (pass.status === "redeemed") return false;
  const until = pass.validUntil
    ? new Date(pass.validUntil)
    : voucherValidUntil(new Date(pass.createdAt));
  return until.getTime() < Date.now();
}

export interface ExplorerPassLabels {
  active: string;
  redeemed: string;
  codeLabel: string;
  orderLabel: string;
  purchasedLabel: string;
  validUntilLabel: string;
  issuedByLabel: string;
  purchasedByLabel: string;
  validForLabel: string;
  ageLabel: string;
  businessLabel: string;
  addressLabel: string;
  howToUseTitle: string;
  howToUseBody: string;
  expiredLabel: string;
}

/**
 * Vouchers issued before the snapshot fields existed have no business details
 * and no expiry, so fill those in from the current mock deal and the standard
 * two-week rule. Stored snapshots always win — a deal edited after purchase
 * must not rewrite an already-issued pass.
 */
function resolvePassDetails(pass: ExplorerPassData) {
  const deal = mockDeals.find((d) => d.id === pass.dealId);
  const purchasedAt = new Date(pass.createdAt);
  return {
    businessName: pass.businessName || deal?.businessName || pass.dealTitle,
    businessAddress: pass.businessAddress || deal?.address || "",
    validUntil: pass.validUntil
      ? new Date(pass.validUntil)
      : voucherValidUntil(purchasedAt),
    purchasedAt,
  };
}

function formatDate(d: Date, short?: boolean): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    // A phone gives each date a third of 375px, and "20 Jul 2026" wraps there.
    // Two digits keep the printed band one line deep, which is the difference
    // between the pass fitting a screen and not.
    year: short ? "2-digit" : "numeric",
  });
}

/** Printed meta line — a small caps label over its value, ticket-stock style. */
function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt
        className="text-[9.5px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--site-text-40)" }}
      >
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-[13.5px] leading-snug ${
          mono ? "select-all font-mono font-semibold tracking-wide tabular-nums" : "font-medium"
        }`}
        style={{ color: "var(--site-text-80)" }}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Pull every pass label from the "myDeals" namespace. Both the reservations
 * page and the payment result page render a pass, so keeping the key list here
 * means adding a field doesn't require touching each call site.
 */
export function passLabels(t: (key: string) => string): ExplorerPassLabels {
  return {
    active: t("active"),
    redeemed: t("redeemed"),
    codeLabel: t("codeLabel"),
    orderLabel: t("orderLabel"),
    purchasedLabel: t("purchasedLabel"),
    validUntilLabel: t("validUntilLabel"),
    issuedByLabel: t("issuedByLabel"),
    purchasedByLabel: t("purchasedByLabel"),
    validForLabel: t("validForLabel"),
    ageLabel: t("ageLabel"),
    businessLabel: t("businessLabel"),
    addressLabel: t("addressLabel"),
    howToUseTitle: t("howToUseTitle"),
    howToUseBody: t("howToUseBody"),
    expiredLabel: t("expiredLabel"),
  };
}

/**
 * A single issued pass, drawn as the physical object it stands in for: a
 * counterfoil stub torn off along a perforated seam, with the redeemable code
 * set as the largest thing on the ticket. Live passes carry gold; a spent one
 * drains to grey and an expired one to wine, so a wallet of several passes can
 * be read at a glance without reading any label.
 */
export function ExplorerPass({
  pass,
  labels,
  compact,
}: {
  pass: ExplorerPassData;
  labels: ExplorerPassLabels;
  /**
   * Phone-wallet sizing: tightens the printed bands and drops the two lines a
   * holder only ever reads once (how-to-use, issuer), so the whole pass lands
   * inside one phone screen and can be held up at a gate without scrolling.
   */
  compact?: boolean;
}) {
  const { businessName, businessAddress, validUntil, purchasedAt } =
    resolvePassDetails(pass);
  const redeemed = pass.status === "redeemed";
  const expired = !redeemed && pass.expired === true;

  // Live gold, spent grey, expired wine — state carried by the stub colour.
  const accent = redeemed
    ? "var(--site-text-40)"
    : expired
      ? "var(--color-wine-light)"
      : "var(--color-gold)";
  const stateLabel = redeemed
    ? labels.redeemed
    : expired
      ? labels.expiredLabel
      : labels.active;
  const spent = redeemed || expired;

  // Legacy passes carry no recipient, so the buyer is the holder.
  const recipientName = [pass.recipientFirstName, pass.recipientLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const holderName = recipientName || pass.buyerName || "";
  const isGift = Boolean(recipientName) && recipientName !== (pass.buyerName ?? "").trim();

  return (
    <article
      className="pass-card relative flex rounded-[20px]"
      style={
        {
          background: "var(--site-bg-elevated)",
          // A spent pass sits back visually without losing legibility.
          opacity: spent ? 0.85 : 1,
          "--pass-seam-color": `color-mix(in oklch, ${accent} 45%, transparent)`,
        } as React.CSSProperties
      }
    >
      {/* Counterfoil stub — face value and state, read sideways off the torn
          edge. This is the part a gate keeps, so it carries only what a gate
          needs: what the pass is worth and whether it is still good. */}
      <div
        className="relative flex w-[52px] shrink-0 flex-col items-center justify-between py-5 sm:w-[60px]"
        style={{
          // Same stock as the ticket, one step back — a real stub is not a
          // different colour, it is the same card on the other side of the
          // tear. Any warm tint at these dark values lands on brown, so the
          // accent is carried by the type on the stub, not by its fill.
          background: "var(--site-bg-surface)",
          borderRadius: "20px 0 0 20px",
        }}
      >
        <Ticket className="size-[15px] shrink-0" style={{ color: accent }} aria-hidden />

        {/* Value and state run up the rail as one line, reading bottom-to-top
            the way a torn stub is held. */}
        <p
          className="flex items-center gap-3 whitespace-nowrap"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          <span
            className="text-[16px] font-bold tabular-nums sm:text-[17px]"
            style={{ color: accent }}
          >
            ₾{pass.amountGEL}
          </span>
          <span
            className="text-[8.5px] font-bold uppercase tracking-[0.2em]"
            style={{ color: `color-mix(in srgb, ${accent} 78%, transparent)` }}
          >
            {stateLabel}
          </span>
        </p>

        {/* Balances the icon at the far end so the rail reads as printed stock
            rather than as two items pinned to the edges. */}
        <span
          className="h-[15px] w-px shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)` }}
          aria-hidden
        />
      </div>

      {/* Perforated seam between stub and ticket, notched at both ends. */}
      <span className="pass-seam" aria-hidden />

      <div className="min-w-0 flex-1">
        {/* Ticket head: what was bought, and the code that redeems it. The code
            is the largest element on the card — it is the only part staff read. */}
        <header className={compact ? "px-4 pb-4 pt-4 sm:px-6" : "px-5 pb-5 pt-5 sm:px-6"}>
          <p
            className="text-[9.5px] font-bold uppercase tracking-[0.24em]"
            style={{ color: accent }}
          >
            {PASS_BRAND}
          </p>
          <h3
            className={`font-display mt-1.5 leading-[1.15] sm:text-[23px] ${
              compact ? "text-[19px]" : "text-[21px]"
            }`}
            style={{ color: "var(--site-text)", textWrap: "balance" }}
          >
            {pass.dealTitle}
          </h3>

          <p
            className={`text-[9.5px] font-semibold uppercase tracking-[0.16em] ${
              compact ? "mt-3" : "mt-4"
            }`}
            style={{ color: "var(--site-text-40)" }}
          >
            {labels.codeLabel}
          </p>
          <p
            className={`mt-1 select-all font-mono text-[19px] font-bold leading-none tracking-[0.14em] sm:text-[22px] ${
              spent ? "line-through decoration-1" : ""
            }`}
            style={{ color: spent ? "var(--site-text-50)" : "var(--site-text)" }}
          >
            {pass.code}
          </p>
        </header>

        {/* Printed meta rail — order and dates on one hairline band. The issuer
            is dropped here: it is the site the holder is already looking at,
            and it stays on the pass footer where a printed ticket carries it. */}
        <dl
          className={`grid gap-y-4 sm:grid-cols-3 sm:px-6 ${
            compact
              ? "grid-cols-3 gap-x-3 px-4 py-3"
              : "grid-cols-2 gap-x-5 px-5 py-4"
          }`}
          style={{
            borderTop: "1px solid var(--site-border-06)",
            borderBottom: "1px solid var(--site-border-06)",
          }}
        >
          {pass.orderNo != null && (
            <Field label={labels.orderLabel} value={String(pass.orderNo)} mono />
          )}
          <Field
            label={labels.purchasedLabel}
            value={formatDate(purchasedAt, compact)}
          />
          <Field
            label={labels.validUntilLabel}
            value={formatDate(validUntil, compact)}
          />
        </dl>

        {/* Who presents the pass. Named separately from the buyer, because a
            pass can be bought as a gift and staff check the holder at the gate,
            so this outranks the venue details below it. */}
        {holderName && (
          <div className={compact ? "px-4 py-3 sm:px-6" : "px-5 py-4 sm:px-6"}>
            <dt
              className="text-[9.5px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--site-text-40)" }}
            >
              {labels.validForLabel}
            </dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span
                className="flex items-center gap-2 text-[17px] font-semibold leading-tight"
                style={{ color: "var(--site-text)" }}
              >
                <User
                  className="size-4 shrink-0"
                  style={{ color: accent }}
                  aria-hidden
                />
                {holderName}
              </span>
              {pass.recipientAge != null && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
                  style={{
                    background: "var(--site-surface-08)",
                    color: "var(--site-text-65)",
                  }}
                >
                  {labels.ageLabel} {pass.recipientAge}
                </span>
              )}
            </dd>
            {/* Who paid matters on the receipt, not at the gate — staff check
                the holder above. Dropped in the wallet to buy back height. */}
            {!compact && isGift && (pass.buyerName || pass.buyerEmail) && (
              <p className="mt-1.5 text-[12px]" style={{ color: "var(--site-text-40)" }}>
                {labels.purchasedByLabel}: {pass.buyerName}
                {pass.buyerName && pass.buyerEmail ? " · " : ""}
                {pass.buyerEmail}
              </p>
            )}
          </div>
        )}

        {/* Where to redeem, then the one line of instruction. Both quiet — a
            holder reads these once, not every time they open the pass. */}
        <footer
          className={compact ? "px-4 pb-4 pt-3 sm:px-6" : "px-5 pb-5 pt-4 sm:px-6"}
          style={{ borderTop: "1px solid var(--site-border-06)" }}
        >
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <p
              className="flex min-w-0 items-start gap-1.5 text-[13px] font-medium"
              style={{ color: "var(--site-text-80)" }}
            >
              <Store
                className="mt-[3px] size-3.5 shrink-0"
                style={{ color: "var(--site-text-40)" }}
                aria-hidden
              />
              <span className="break-words">{businessName}</span>
            </p>
            {businessAddress && (
              <p
                className="flex min-w-0 items-start gap-1.5 text-[13px]"
                style={{ color: "var(--site-text-50)" }}
              >
                <MapPin
                  className="mt-[3px] size-3.5 shrink-0"
                  style={{ color: "var(--site-text-40)" }}
                  aria-hidden
                />
                <span className="break-words">{businessAddress}</span>
              </p>
            )}
          </div>
          {/* In the wallet these two lines are dropped: they cost the height
              that decides whether the pass fits a phone screen, and a holder
              who already bought the pass has read them once on the receipt. */}
          {!compact && (
            <>
              <p
                className="mt-3 text-[12px] leading-relaxed"
                style={{ color: "var(--site-text-40)" }}
              >
                <span className="font-semibold uppercase tracking-[0.14em]">
                  {labels.howToUseTitle}
                </span>{" "}
                — {labels.howToUseBody}
              </p>
              <p
                className="mt-2 text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--site-text-35)" }}
              >
                {labels.issuedByLabel} {PASS_ISSUER}
              </p>
            </>
          )}
        </footer>
      </div>
    </article>
  );
}
