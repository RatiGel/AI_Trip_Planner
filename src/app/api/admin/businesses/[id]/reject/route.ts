import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";
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
  const { reason } = await req.json() as { reason?: string };

  await connectDB();

  const request = await BusinessRequestModel.findByIdAndUpdate(
    id,
    { status: "rejected", rejectionReason: reason ?? "" },
    { new: true }
  );
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });

  await AuditLogModel.create({
    adminId,
    adminEmail,
    action: "REJECT_BUSINESS",
    targetType: "business_request",
    targetId: id,
    metadata: { reason },
  });

  return Response.json({ ok: true });
}
