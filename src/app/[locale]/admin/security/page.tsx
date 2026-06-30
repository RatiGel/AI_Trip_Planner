import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { AuditLogModel } from "@/lib/models/audit-log";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default async function AdminSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const raw = await AuditLogModel.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const entries = raw.map((e: any) => ({
    id: e._id.toString(),
    adminEmail: e.adminEmail,
    action: e.action,
    targetType: e.targetType ?? null,
    targetId: e.targetId ?? null,
    createdAt: (e.createdAt as Date).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security · Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Last {entries.length} admin action(s) — read-only
        </p>
      </div>
      <AuditLogTable entries={entries} />
    </div>
  );
}
