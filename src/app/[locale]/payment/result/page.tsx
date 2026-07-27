import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PaymentModel } from "@/lib/models/payment";
import { VoucherModel } from "@/lib/models/voucher";

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
      <Link
        href={`/${locale}`}
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
