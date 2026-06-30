import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { PlaceModel } from "@/lib/models/place";
import { PlatformCharts } from "@/components/admin/platform-charts";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const [totalUsers, totalListings, activeListings, usersByRoleRaw, listingsByCityRaw, listingsByCategoryRaw] =
    await Promise.all([
      UserModel.countDocuments(),
      PlaceModel.countDocuments(),
      PlaceModel.countDocuments({ status: "active" }),
      UserModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      PlaceModel.aggregate([
        { $group: { _id: "$citySlug", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      PlaceModel.aggregate([
        { $unwind: "$categories" },
        { $group: { _id: "$categories", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

  const stats = {
    usersByRole: usersByRoleRaw.map((r: any) => ({ role: r._id ?? "unknown", count: r.count })),
    listingsByCity: listingsByCityRaw.map((r: any) => ({ city: r._id ?? "unknown", count: r.count })),
    listingsByCategory: listingsByCategoryRaw.map((r: any) => ({ category: r._id ?? "unknown", count: r.count })),
  };

  const kpis = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Listings", value: totalListings },
    { label: "Active Listings", value: activeListings },
    { label: "Pending Listings", value: totalListings - activeListings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Reports</h1>
        <p className="text-sm text-muted-foreground">Aggregated stats across the platform</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <PlatformCharts stats={stats} />
    </div>
  );
}
