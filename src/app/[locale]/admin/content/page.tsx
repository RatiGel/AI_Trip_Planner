import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { ReportModel } from "@/lib/models/report";
import { ContentModeration } from "@/components/admin/content-moderation";

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const rawReports = await ReportModel.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .lean();

  const reports = rawReports.map((r: any) => ({
    id: r._id.toString(),
    reporterEmail: r.reporterEmail ?? "Unknown",
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    createdAt: (r.createdAt as Date).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Moderation</h1>
        <p className="text-sm text-muted-foreground">{reports.length} pending report(s)</p>
      </div>
      <ContentModeration reports={reports} />
    </div>
  );
}
