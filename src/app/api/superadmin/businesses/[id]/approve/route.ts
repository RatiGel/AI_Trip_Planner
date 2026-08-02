import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";
import { UserModel } from "@/lib/models/user";
import { AuditLogModel } from "@/lib/models/audit-log";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { id } = await params;
  const adminId = actor.id;
  const adminEmail = actor.email;

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
