import { getActor } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

/**
 * Upgrade the signed-in tourist account to a business account.
 * Idempotent — already-business/admin accounts just get { ok: true }.
 *
 * Note: the role lives in the JWT, so the client must refresh the session
 * (re-fetch / re-sign-in) for the new role to take effect in the UI.
 */
export async function POST() {
  const actor = await getActor();

  if (!actor) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: userId, role } = actor;

  if (["business", "superadmin"].includes(role)) {
    return Response.json({ ok: true, role });
  }

  await connectDB();
  await UserModel.updateOne({ _id: userId }, { role: "business" });

  return Response.json({ ok: true, role: "business" });
}
