import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";
import { UserModel } from "@/lib/models/user";
import { BusinessesApproval } from "@/components/admin/businesses-approval";
import { getGlobalListingFeeTetri } from "@/lib/listing-fee";

export default async function AdminBusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const rawRequests = await BusinessRequestModel.find()
    .sort({ createdAt: -1 })
    .lean();

  const globalFeeTetri = await getGlobalListingFeeTetri();

  const userIds = rawRequests.map((r: any) => r.userId);
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("_id name email")
    .lean();
  const userMap = Object.fromEntries(
    users.map((u: any) => [u._id.toString(), { name: u.name, email: u.email }])
  );

  const requests = rawRequests.map((r: any) => ({
    id: r._id.toString(),
    userId: r.userId,
    userName: userMap[r.userId]?.name ?? "Unknown",
    userEmail: userMap[r.userId]?.email ?? "",
    businessName: r.businessName,
    businessType: r.businessType,
    description: r.description,
    status: r.status,
    createdAt: (r.createdAt as Date).toISOString(),
  }));

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Requests</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} pending · {requests.length} total
        </p>
      </div>
      <BusinessesApproval requests={requests} globalFeeTetri={globalFeeTetri} />
    </div>
  );
}
