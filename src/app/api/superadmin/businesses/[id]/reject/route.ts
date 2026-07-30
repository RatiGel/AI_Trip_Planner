import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";
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
