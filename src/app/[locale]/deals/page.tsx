import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { mockDeals } from "@/lib/mock/deals";
import { DealsGrid } from "@/components/site/deals-grid";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/deals",
    title: "Tbilisi Deals & Discounts",
    description:
      "Save on Tbilisi attractions, tours, dining, and experiences. Exclusive discounted offers for your Georgia trip, updated regularly.",
  });
}

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "deals" });

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
        <DealsGrid deals={mockDeals} />
      </div>
    </div>
  );
}
