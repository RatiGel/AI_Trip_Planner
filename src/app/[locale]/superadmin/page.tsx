import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { BusinessRequestModel } from "@/lib/models/business-request";

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const [totalUsers, pendingRequests] = await Promise.all([
    UserModel.countDocuments(),
    BusinessRequestModel.countDocuments({ status: "pending" }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Pending Business Requests", value: pendingRequests },
    { label: "Active Listings", value: "—" },
    { label: "Revenue", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Super admin control panel</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
