import { auth } from "@/lib/auth";
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
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (["business", "admin"].includes(role ?? "")) {
    return Response.json({ ok: true, role });
  }

  await connectDB();
  await UserModel.updateOne({ _id: userId }, { role: "business" });

  return Response.json({ ok: true, role: "business" });
}
