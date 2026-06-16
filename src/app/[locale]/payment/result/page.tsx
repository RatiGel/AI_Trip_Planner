import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PaymentModel } from "@/lib/models/payment";

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
  if (order_id) {
    await connectDB();
    const payment = await PaymentModel.findOne({ orderId: order_id })
      .select("status")
      .lean<{ status: "pending" | "paid" | "failed" }>();
    if (payment) status = payment.status;
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
      <Link
        href={`/${locale}`}
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
