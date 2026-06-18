import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { ItineraryModel } from "@/lib/models/itinerary";
import { ReservationModel } from "@/lib/models/reservation";
import { PlaceModel } from "@/lib/models/place";
import { PricingPlanModel } from "@/lib/models/pricing-plan";
import { KpiCards, type KpiData } from "@/components/admin/analytics/kpi-cards";
import { TripsBarChart, type MonthlyCount } from "@/components/admin/analytics/trips-bar-chart";
import { UsersLineChart } from "@/components/admin/analytics/users-line-chart";
import { CategoriesDonutChart, type CategoryCount } from "@/components/admin/analytics/categories-donut-chart";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildMonthlyBuckets(
  raw: { _id: { year: number; month: number }; count: number }[]
): MonthlyCount[] {
  const now = new Date();
  const buckets: MonthlyCount[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTH_ABBR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const found = raw.find(
      (r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
    );
    buckets.push({ month: label, count: found?.count ?? 0 });
  }
  return buckets;
}

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalTrips,
    revenueAgg,
    activePlansCount,
    rawTripsMonthly,
    rawUsersMonthly,
    rawCategories,
  ] = await Promise.all([
    UserModel.countDocuments(),
    ItineraryModel.countDocuments(),
    ReservationModel.aggregate<{ total: number }>([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$priceGEL" } } },
    ]),
    PricingPlanModel.countDocuments({ active: true }),
    ItineraryModel.aggregate<{ _id: { year: number; month: number }; count: number }>([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    UserModel.aggregate<{ _id: { year: number; month: number }; count: number }>([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    PlaceModel.aggregate<{ _id: string; count: number }>([
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const kpi: KpiData = {
    users: totalUsers,
    trips: totalTrips,
    revenueGEL: revenueAgg[0]?.total ?? 0,
    activePlans: activePlansCount,
  };

  const tripsData = buildMonthlyBuckets(rawTripsMonthly);
  const usersData = buildMonthlyBuckets(rawUsersMonthly);
  const categoriesData: CategoryCount[] = rawCategories.map((r) => ({
    name: r._id,
    value: r.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform performance at a glance</p>
      </div>

      <KpiCards data={kpi} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TripsBarChart data={tripsData} />
        <UsersLineChart data={usersData} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoriesDonutChart data={categoriesData} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Reservation Revenue Breakdown
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Reservations</span>
              <span className="font-medium tabular-nums">
                ₾ {kpi.revenueGEL.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Users</span>
              <span className="font-medium tabular-nums">
                {kpi.users.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Trips Generated</span>
              <span className="font-medium tabular-nums">
                {kpi.trips.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Pricing Plans</span>
              <span className="font-medium tabular-nums">{kpi.activePlans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Place Categories</span>
              <span className="font-medium tabular-nums">{categoriesData.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
