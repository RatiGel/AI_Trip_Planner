import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Ticket } from "lucide-react";
import { connectDB } from "@/lib/db";
import { PaymentModel } from "@/lib/models/payment";
import { VoucherModel } from "@/lib/models/voucher";
import {
  ExplorerPass,
  isPassExpired,
  passLabels,
  PASS_ISSUER,
  type ExplorerPassData,
} from "@/components/site/explorer-pass";
import { backfillOrderNumbers } from "@/lib/voucher";

type ResultStatus = "pending" | "paid" | "failed" | "unknown";

/** Clock — dial plus hands, so it reads as waiting rather than as a stray tick. */
const CLOCK = "M12 8 L12 12.5 L15.5 14.5 M12 3.5 A8.5 8.5 0 1 1 11.99 3.5";

/**
 * Each state gets its own seal colour and mark. The seal is the one loud
 * element on the page, so the status reads before any of the text does.
 */
const SEAL: Record<ResultStatus, { color: string; path: string }> = {
  // Check — drawn stroke, so it completes as the seal lands.
  paid: { color: "var(--color-gold)", path: "M5 12.5 L10 17.5 L19 7" },
  // Slash — a clean refusal, no apology.
  failed: { color: "var(--color-wine-light)", path: "M7 7 L17 17 M17 7 L7 17" },
  pending: { color: "var(--color-gold-light)", path: CLOCK },
  unknown: { color: "var(--color-gold-light)", path: CLOCK },
};

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { order_id } = await searchParams;
  const t = await getTranslations({ locale, namespace: "payment" });
  const td = await getTranslations({ locale, namespace: "myDeals" });

  let status: ResultStatus = "unknown";
  // One payment can issue several passes (one per recipient), so this is a list.
  let passes: ExplorerPassData[] = [];
  if (order_id) {
    await connectDB();
    const payment = await PaymentModel.findOne({ orderId: order_id })
      .select("status purpose")
      .lean<{ status: "pending" | "paid" | "failed"; purpose: string }>();
    if (payment) {
      status = payment.status;
      if (payment.status === "paid" && payment.purpose === "deal") {
        const vouchers = await VoucherModel.find({ paymentOrderId: order_id })
          .sort({ recipientIndex: 1 })
          .lean<
            {
              _id: unknown;
              code: string;
              dealId: string;
              dealTitle: string;
              amountGEL: number;
              status: string;
              createdAt: Date;
              validUntil?: Date;
              buyerName?: string;
              buyerEmail?: string;
              recipientFirstName?: string;
              recipientLastName?: string;
              recipientAge?: number;
              businessName?: string;
              businessAddress?: string;
              orderNo?: number;
            }[]
          >();
        const backfilled = await backfillOrderNumbers(vouchers);
        passes = vouchers.map((v) => {
          const p: ExplorerPassData = {
            id: String(v._id),
            code: v.code,
            dealId: v.dealId,
            dealTitle: v.dealTitle,
            amountGEL: v.amountGEL,
            status: v.status,
            createdAt: v.createdAt.toISOString(),
            validUntil: v.validUntil?.toISOString(),
            buyerName: v.buyerName,
            buyerEmail: v.buyerEmail,
            recipientFirstName: v.recipientFirstName,
            recipientLastName: v.recipientLastName,
            recipientAge: v.recipientAge,
            businessName: v.businessName,
            businessAddress: v.businessAddress,
            orderNo: v.orderNo ?? backfilled.get(String(v._id)),
          };
          return { ...p, expired: isPassExpired(p) };
        });
      }
    }
  }

  const paid = status === "paid";
  const heading = paid
    ? t("successTitle")
    : status === "failed"
      ? t("failedTitle")
      : t("pendingTitle");
  const message = paid
    ? t("successBody")
    : status === "failed"
      ? t("failedBody")
      : t("pendingBody");
  const seal = SEAL[status];
  // Total charged, shown on the counterfoil the way a stub prints it.
  const total = passes.reduce((sum, p) => sum + p.amountGEL, 0);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--site-bg-base)" }}
    >
      {/* A single pool of gold light behind the seal — the stamp catching the
          light. Kept far below text-contrast thresholds. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 12%, color-mix(in oklch, var(--color-gold) 13%, transparent), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-xl px-5 pb-20 pt-16 md:pt-20">
        {/* Counterfoil: the stub torn off and handed back. Corners are rounded
            per-section rather than clipped, so the seam notches stay visible. */}
        <div
          className="relative rounded-3xl"
          style={{
            background: "var(--site-bg-surface)",
            border: "1px solid var(--site-border-08)",
            boxShadow: "0 30px 80px -40px rgba(0,0,0,0.9)",
          }}
        >
          <div className="px-6 pb-9 pt-11 text-center md:px-10">
            {/* Stamped seal */}
            <div className="relative mx-auto mb-7 size-[68px]">
              <span
                className="seal-ring absolute inset-0 rounded-full"
                style={{ border: `2px solid ${seal.color}` }}
                aria-hidden
              />
              <span
                className="seal-stamp absolute inset-0 flex items-center justify-center rounded-full"
                style={{
                  background: `color-mix(in oklch, ${seal.color} 14%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${seal.color} 45%, transparent)`,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-8"
                  fill="none"
                  stroke={seal.color}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {/* Only the check self-draws — its stroke length matches the
                      dash offset. The clock and cross simply arrive stamped. */}
                  <path className={paid ? "seal-draw" : undefined} d={seal.path} />
                </svg>
              </span>
            </div>

            <p
              className="result-rise mb-3 text-[11px] font-bold uppercase tracking-[3px]"
              style={{ animationDelay: "0.22s", color: seal.color }}
            >
              {PASS_ISSUER}
            </p>
            <h1
              className="result-rise font-display leading-[1.05]"
              style={{
                animationDelay: "0.28s",
                fontSize: "clamp(32px, 6vw, 46px)",
                letterSpacing: "-1.5px",
                color: "var(--site-text)",
                textWrap: "balance",
              }}
            >
              {heading}
            </h1>
            <p
              className="result-rise mx-auto mt-4 max-w-sm text-[15px] leading-relaxed"
              style={{ animationDelay: "0.34s", color: "var(--site-text-60)" }}
            >
              {message}
            </p>
          </div>

          {/* Torn seam, then the printed detail line — the part of a stub
              that carries the numbers. */}
          {paid && passes.length > 0 && (
            <div className="result-seam">
              <dl className="flex items-stretch">
                <div className="flex-1 px-6 py-5 text-left md:px-10">
                  <dt
                    className="text-[10px] font-medium uppercase tracking-[0.16em]"
                    style={{ color: "var(--site-text-40)" }}
                  >
                    {t("passCount")}
                  </dt>
                  <dd
                    className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold"
                    style={{ color: "var(--site-text)" }}
                  >
                    <Ticket className="size-4" style={{ color: seal.color }} />
                    {passes.length}
                  </dd>
                </div>
                <div
                  className="my-4 w-px"
                  style={{ background: "var(--site-border-08)" }}
                  aria-hidden
                />
                <div className="flex-1 px-6 py-5 text-left md:px-10">
                  <dt
                    className="text-[10px] font-medium uppercase tracking-[0.16em]"
                    style={{ color: "var(--site-text-40)" }}
                  >
                    {t("totalPaid")}
                  </dt>
                  <dd
                    className="mt-1 text-[15px] font-semibold tabular-nums"
                    style={{ color: "var(--site-text)" }}
                  >
                    ₾ {total}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* The pass itself, hanging off the counterfoil as one continuous
              strip. With several passes the strip carries the first and the
              rest follow below, so the stack never reads as loose receipts. */}
          {passes.length > 0 && (
            <div
              className="result-rise px-3 pb-3 md:px-4 md:pb-4"
              style={
                {
                  animationDelay: "0.46s",
                  // The pass sits on the counterfoil here, not the page, so its
                  // seam punches must show the counterfoil's surface.
                  "--pass-page": "var(--site-bg-surface)",
                } as React.CSSProperties
              }
            >
              <ExplorerPass pass={passes[0]} labels={passLabels(td)} />
            </div>
          )}
        </div>

        {/* Passes beyond the first, for group purchases. */}
        {passes.length > 1 && (
          <div className="mt-8 space-y-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--site-text-40)" }}
            >
              {t("morePasses", { count: passes.length - 1 })}
            </p>
            {passes.slice(1).map((p, i) => (
              <div
                key={p.id}
                className="result-rise"
                style={{ animationDelay: `${0.52 + i * 0.07}s` }}
              >
                <ExplorerPass pass={p} labels={passLabels(td)} />
              </div>
            ))}
          </div>
        )}

        {/* Where to go next. Paid buyers want the pass again later, so send
            them to the wallet; everyone else back to the deals. */}
        <div
          className="result-rise mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          style={{ animationDelay: "0.6s" }}
        >
          {paid && (
            <Link
              href={`/${locale}/reservations`}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
              style={{
                background: "var(--color-gold)",
                color: "#0A0A0A",
                outlineColor: "var(--color-gold)",
              }}
            >
              {t("viewMyPasses")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <Link
            href={paid ? `/${locale}` : `/${locale}/deals`}
            className="inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
            style={{
              border: "1px solid var(--site-border-20)",
              color: "var(--site-text-80)",
              outlineColor: "var(--color-gold)",
            }}
          >
            {paid ? t("backHome") : t("browseDeals")}
          </Link>
        </div>
      </div>
    </div>
  );
}
