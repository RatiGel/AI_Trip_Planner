import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { AuditLogModel } from "@/lib/models/audit-log";

async function requireAdminSession() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") return null;
  return session;
}

async function log(
  adminId: string,
  adminEmail: string,
  action: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  await AuditLogModel.create({ adminId, adminEmail, action, targetType: "user", targetId, metadata });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminId = (session.user as { id?: string }).id!;
  const adminEmail = session.user.email ?? "";
  const body = await req.json() as { name?: string; email?: string; role?: string; suspended?: boolean };

  await connectDB();

  if (body.email) {
    const existing = await UserModel.findOne({ email: body.email, _id: { $ne: id } });
    if (existing) return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.email !== undefined) update.email = body.email;
  if (body.role !== undefined) update.role = body.role;
  if (body.suspended !== undefined) update.suspended = body.suspended;

  const updated = await UserModel.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  await log(adminId, adminEmail, "UPDATE_USER", id, update);
  return Response.json({ id: (updated as any)._id.toString() });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminId = (session.user as { id?: string }).id!;
  const adminEmail = session.user.email ?? "";

  if (id === adminId) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await connectDB();
  const deleted = await UserModel.findByIdAndDelete(id);
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });

  await log(adminId, adminEmail, "DELETE_USER", id);
  return Response.json({ ok: true });
}
