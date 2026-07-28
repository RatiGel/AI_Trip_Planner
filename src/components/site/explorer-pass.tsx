import { CalendarCheck, MapPin, Store, Ticket, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockDeals } from "@/lib/mock/deals";
import { voucherValidUntil } from "@/lib/models/voucher";

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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-sm text-foreground ${
          mono ? "select-all font-mono font-bold tracking-wider" : "font-medium"
        }`}
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

export function ExplorerPass({
  pass,
  labels,
}: {
  pass: ExplorerPassData;
  labels: ExplorerPassLabels;
}) {
  const { businessName, businessAddress, validUntil, purchasedAt } =
    resolvePassDetails(pass);
  const redeemed = pass.status === "redeemed";
  const expired = !redeemed && pass.expired === true;

  // Legacy passes carry no recipient, so the buyer is the holder.
  const recipientName = [pass.recipientFirstName, pass.recipientLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const holderName = recipientName || pass.buyerName || "";
  const isGift = Boolean(recipientName) && recipientName !== (pass.buyerName ?? "").trim();

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card text-left">
      {/* Pass header: brand + status */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-border bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Ticket className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {PASS_BRAND}
            </p>
            <p className="text-base font-semibold leading-tight">{pass.dealTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">₾ {pass.amountGEL}</span>
          <Badge
            variant={redeemed || expired ? "outline" : "default"}
            className={expired ? "text-destructive" : undefined}
          >
            {redeemed ? labels.redeemed : expired ? labels.expiredLabel : labels.active}
          </Badge>
        </div>
      </header>

      {/* Voucher code — the part staff scan or read */}
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {labels.codeLabel}
        </p>
        <p className="mt-1 select-all font-mono text-2xl font-bold tracking-[0.2em] text-foreground">
          {pass.code}
        </p>
      </div>

      {/* Purchase + holder details */}
      <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        {pass.orderNo != null && (
          <Field label={labels.orderLabel} value={String(pass.orderNo)} mono />
        )}
        <Field label={labels.purchasedLabel} value={formatDate(purchasedAt)} />
        <Field label={labels.validUntilLabel} value={formatDate(validUntil)} />
        <Field label={labels.issuedByLabel} value={PASS_ISSUER} />
      </dl>

      {/* Who presents the pass. Named separately from the buyer, because a pass
          can be bought as a gift and staff check the holder at the gate. */}
      {holderName && (
        <div className="border-t border-border px-5 py-4">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {labels.validForLabel}
          </dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-base font-semibold text-foreground">
              <User className="size-4 shrink-0 text-muted-foreground" />
              {holderName}
            </span>
            {pass.recipientAge != null && (
              <Badge variant="secondary">
                {labels.ageLabel} {pass.recipientAge}
              </Badge>
            )}
          </dd>
          {isGift && (pass.buyerName || pass.buyerEmail) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {labels.purchasedByLabel}: {pass.buyerName}
              {pass.buyerName && pass.buyerEmail ? " · " : ""}
              {pass.buyerEmail}
            </p>
          )}
        </div>
      )}

      {/* Where to redeem */}
      <div className="grid gap-4 border-t border-border px-5 py-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {labels.businessLabel}
          </dt>
          <dd className="mt-0.5 flex items-start gap-1.5 text-sm font-medium text-foreground">
            <Store className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="break-words">{businessName}</span>
          </dd>
        </div>
        {businessAddress && (
          <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.addressLabel}
            </dt>
            <dd className="mt-0.5 flex items-start gap-1.5 text-sm font-medium text-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="break-words">{businessAddress}</span>
            </dd>
          </div>
        )}
      </div>

      {/* How to use */}
      <footer className="border-t border-dashed border-border bg-muted/30 px-5 py-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <CalendarCheck className="size-3.5 text-primary" />
          {labels.howToUseTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{labels.howToUseBody}</p>
      </footer>
    </article>
  );
}
