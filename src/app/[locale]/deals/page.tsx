import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { mockDeals } from "@/lib/mock/deals";
import { DealsGrid } from "@/components/site/deals-grid";
import type { DealOption } from "@/types";

async function getActiveDeals(): Promise<DealOption[]> {
  await connectDB();
  const todayIso = new Date().toISOString().slice(0, 10);
  const raw = await DealModel.find({ status: "approved", active: true })
    .sort({ createdAt: -1 })
    .lean();
  const deals: DealOption[] = raw
    // Drop expired deals (validUntil in the past); keep ones with no expiry.
    .filter((d) => !d.validUntil || d.validUntil >= todayIso)
    .map((d) => ({
      id: String(d._id),
      title: d.title,
      description: d.description,
      priceOriginal: d.priceOriginal,
      priceGEL: d.priceGEL,
      discountPct: d.discountPct,
      category: d.category,
      validUntil: d.validUntil,
      image: d.image,
      badge: d.badge,
    }));
  // Fall back to mock data until the catalogue is populated.
  return deals.length > 0 ? deals : mockDeals;
}

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "deals" });
  const deals = await getActiveDeals();

  return (
    <div style={{ background: "var(--site-bg-base)", minHeight: "100vh" }}>
      {/* Hero */}
      <div
        className="relative flex items-end overflow-hidden"
        style={{ height: 320, paddingTop: 72 }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p
            className="mb-3 text-[11px] font-bold uppercase tracking-[3px]"
            style={{ color: "#E8A020" }}
          >
            {t("eyebrow")}
          </p>
          <h1
            className="font-display leading-tight text-white"
            style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}
          >
            {t("heading")}{" "}
            <em className="italic" style={{ color: "#E8A020" }}>
              {t("headingEm")}
            </em>
          </h1>
          <p className="mt-3 max-w-xl text-white/60" style={{ fontSize: "clamp(14px, 1.5vw, 16px)" }}>
            {t("description")}
          </p>
        </div>
      </div>

      {/* Deals grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <DealsGrid deals={deals} />
      </div>
    </div>
  );
}
