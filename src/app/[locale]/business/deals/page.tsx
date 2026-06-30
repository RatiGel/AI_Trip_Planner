import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { DealsPanel, type OwnDeal } from "@/components/business/deals-panel";

export default async function BusinessDealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  await connectDB();
  const raw = userId
    ? await DealModel.find({ ownerId: userId }).sort({ createdAt: -1 }).lean()
    : [];

  const deals: OwnDeal[] = raw.map((d) => ({
    id: String(d._id),
    title: d.title,
    category: d.category,
    priceGEL: d.priceGEL,
    status: d.status,
    rejectionReason: d.rejectionReason ?? "",
    createdAt: (d.createdAt as Date).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
        <p className="text-sm text-muted-foreground">
          Propose a deal for your business. It goes live once an admin approves it.
        </p>
      </div>
      <DealsPanel initial={deals} />
    </div>
  );
}
