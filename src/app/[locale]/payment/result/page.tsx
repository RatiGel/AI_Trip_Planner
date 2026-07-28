import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PaymentModel } from "@/lib/models/payment";
import { VoucherModel } from "@/lib/models/voucher";
import {
  ExplorerPass,
  isPassExpired,
  passLabels,
  type ExplorerPassData,
} from "@/components/site/explorer-pass";
import { backfillOrderNumbers } from "@/lib/voucher";

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

  let status: "pending" | "paid" | "failed" | "unknown" = "unknown";
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

  const heading =
    status === "paid" ? t("successTitle") : status === "failed" ? t("failedTitle") : t("pendingTitle");
  const message =
    status === "paid" ? t("successBody") : status === "failed" ? t("failedBody") : t("pendingBody");

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
      style={{ background: "var(--site-bg-base)" }}
    >
      <div className="text-6xl">{status === "paid" ? "✅" : status === "failed" ? "❌" : "⏳"}</div>
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <p className="max-w-md text-muted-foreground">{message}</p>
      {passes.length > 0 && (
        <div className="w-full max-w-lg space-y-5">
          {passes.map((p) => (
            <ExplorerPass key={p.id} pass={p} labels={passLabels(td)} />
          ))}
        </div>
      )}
      <Link
        href={`/${locale}`}
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
