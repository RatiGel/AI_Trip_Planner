import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PricingPlanModel } from "@/lib/models/pricing-plan";
import { PricingManager, type Plan } from "@/components/admin/pricing-form";
import { ListingFeeCard } from "@/components/admin/listing-fee-card";
import { getGlobalListingFeeTetri } from "@/lib/listing-fee";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const [raw, listingFeeTetri] = await Promise.all([
    PricingPlanModel.find().sort({ order: 1 }).lean(),
    getGlobalListingFeeTetri(),
  ]);

  const plans: Plan[] = raw.map((p) => ({
    _id: String(p._id),
    name: p.name,
    slug: p.slug,
    priceMonthlyUsd: p.priceMonthlyUsd,
    priceYearlyUsd: p.priceYearlyUsd,
    currency: p.currency,
    features: p.features ?? [],
    highlighted: p.highlighted,
    active: p.active,
    order: p.order,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Plans & Pricing
        </h1>
        <p className="text-muted-foreground">
          Manage subscription tiers, pricing, and feature lists.
        </p>
      </div>
      <PricingManager initial={plans} />
      <ListingFeeCard initialTetri={listingFeeTetri} />
    </div>
  );
}
