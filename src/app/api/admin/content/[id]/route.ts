import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ReportModel } from "@/lib/models/report";
import { ReviewModel } from "@/lib/models/review";
import { PlaceModel } from "@/lib/models/place";
import { UserModel } from "@/lib/models/user";
import { AuditLogModel } from "@/lib/models/audit-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const adminId = (session!.user as { id?: string }).id!;
  const adminEmail = session!.user.email ?? "";
  const { action } = await req.json() as { action: "remove" | "dismiss" | "warn" };

  await connectDB();

  const report = await ReportModel.findById(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "dismiss") {
    await ReportModel.findByIdAndUpdate(id, { status: "dismissed" });
    await AuditLogModel.create({ adminId, adminEmail, action: "DISMISS_REPORT", targetType: "report", targetId: id });
    return Response.json({ ok: true });
  }

  if (action === "warn") {
    await Promise.all([
      ReportModel.findByIdAndUpdate(id, { status: "resolved" }),
      UserModel.findByIdAndUpdate(report.reporterId, { $inc: { warnings: 1 } }),
      AuditLogModel.create({ adminId, adminEmail, action: "WARN_USER", targetType: "report", targetId: id }),
    ]);
    return Response.json({ ok: true });
  }

  if (action === "remove") {
    await ReportModel.findByIdAndUpdate(id, { status: "resolved" });
    if (report.targetType === "review") {
      await ReviewModel.findByIdAndDelete(report.targetId);
    } else if (report.targetType === "listing") {
      await PlaceModel.findByIdAndDelete(report.targetId);
    }
    await AuditLogModel.create({
      adminId,
      adminEmail,
      action: "REMOVE_CONTENT",
      targetType: report.targetType,
      targetId: report.targetId,
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
