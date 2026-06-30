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
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const adminId = (session!.user as { id?: string }).id!;
  const adminEmail = session!.user.email ?? "";

  // Fee decision applied to the new business owner. Defaults to the global fee.
  const body = (await req.json().catch(() => ({}))) as {
    feeMode?: "global" | "custom" | "exempt";
    feeOverrideTetri?: number;
  };
  const feeMode = body.feeMode ?? "global";

  let customTetri: number | undefined;
  if (feeMode === "custom") {
    customTetri = Math.round(Number(body.feeOverrideTetri));
    if (!Number.isFinite(customTetri) || customTetri < 0) {
      return Response.json({ error: "Invalid custom fee" }, { status: 400 });
    }
  }

  await connectDB();

  const request = await BusinessRequestModel.findById(id);
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });

  // custom: store the override. global/exempt: clear any prior override so the
  // owner falls back to the global fee (or pays nothing when exempt).
  const userUpdate =
    feeMode === "custom"
      ? { role: "business", feeExempt: false, feeOverrideTetri: customTetri }
      : {
          role: "business",
          feeExempt: feeMode === "exempt",
          $unset: { feeOverrideTetri: "" },
        };

  await Promise.all([
    BusinessRequestModel.findByIdAndUpdate(id, { status: "approved" }),
    UserModel.findByIdAndUpdate(request.userId, userUpdate),
    AuditLogModel.create({
      adminId,
      adminEmail,
      action: "APPROVE_BUSINESS",
      targetType: "business_request",
      targetId: id,
      metadata: {
        userId: request.userId,
        businessName: request.businessName,
        feeMode,
        feeOverrideTetri: customTetri,
      },
    }),
  ]);

  return Response.json({ ok: true });
}
