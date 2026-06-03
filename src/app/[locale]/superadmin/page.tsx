import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { PlaceModel } from "@/lib/models/place";
import { BusinessRequestModel } from "@/lib/models/business-request";
import { ReportModel } from "@/lib/models/report";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, Building2, FileText, Users } from "lucide-react";

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const [totalUsers, totalListings, pendingRequests, pendingReports] = await Promise.all([
    UserModel.countDocuments(),
    PlaceModel.countDocuments(),
    BusinessRequestModel.countDocuments({ status: "pending" }),
    ReportModel.countDocuments({ status: "pending" }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, href: "/superadmin/users" },
    { label: "Total Listings", value: totalListings, icon: FileText, href: "/superadmin/reports" },
    { label: "Pending Business Requests", value: pendingRequests, icon: Building2, href: "/superadmin/businesses", alert: pendingRequests > 0 },
    { label: "Pending Reports", value: pendingReports, icon: AlertCircle, href: "/superadmin/content", alert: pendingReports > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Super admin control panel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, alert }) => (
          <Link key={label} href={href} className="block group">
            <div className={`rounded-2xl border p-5 transition-colors group-hover:bg-accent ${alert && value > 0 ? "border-amber-400 dark:border-amber-600" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`size-4 ${alert && value > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <p className={`mt-1 text-2xl font-semibold ${alert && value > 0 ? "text-amber-500" : ""}`}>
                {value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pendingRequests > 0 && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
            <p className="font-medium text-sm">{pendingRequests} business request{pendingRequests > 1 ? "s" : ""} awaiting approval</p>
            <Button size="sm" className="mt-3" asChild>
              <Link href="/superadmin/businesses">Review now →</Link>
            </Button>
          </div>
        )}
        {pendingReports > 0 && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5">
            <p className="font-medium text-sm">{pendingReports} content report{pendingReports > 1 ? "s" : ""} pending review</p>
            <Button size="sm" variant="destructive" className="mt-3" asChild>
              <Link href="/superadmin/content">Review now →</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
