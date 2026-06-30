import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { DealsManager, type Deal } from "@/components/admin/deals-manager";

export default async function AdminDealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const raw = await DealModel.find().sort({ createdAt: -1 }).lean();

  const deals: Deal[] = raw.map((d) => ({
    _id: String(d._id),
    title: d.title,
    description: d.description,
    priceOriginal: d.priceOriginal,
    priceGEL: d.priceGEL,
    discountPct: d.discountPct,
    category: d.category,
    validUntil: d.validUntil ?? "",
    image: d.image ?? "",
    badge: d.badge ?? "",
    ownerId: d.ownerId ?? undefined,
    status: d.status,
    active: d.active,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Deals</h1>
        <p className="text-muted-foreground">
          Create and manage deals, and review business-submitted ones.
        </p>
      </div>
      <DealsManager initial={deals} />
    </div>
  );
}
