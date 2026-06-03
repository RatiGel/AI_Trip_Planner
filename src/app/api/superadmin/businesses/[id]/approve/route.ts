import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";
import { UserModel } from "@/lib/models/user";
import { AuditLogModel } from "@/lib/models/audit-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "superadmin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const adminId = (session!.user as { id?: string }).id!;
  const adminEmail = session!.user.email ?? "";

  await connectDB();

  const request = await BusinessRequestModel.findById(id);
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });

  await Promise.all([
    BusinessRequestModel.findByIdAndUpdate(id, { status: "approved" }),
    UserModel.findByIdAndUpdate(request.userId, { role: "business" }),
    AuditLogModel.create({
      adminId,
      adminEmail,
      action: "APPROVE_BUSINESS",
      targetType: "business_request",
      targetId: id,
      metadata: { userId: request.userId, businessName: request.businessName },
    }),
  ]);

  return Response.json({ ok: true });
}
