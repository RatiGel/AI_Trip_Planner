import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

const ADMIN_EMAIL = "ninikusradze@gmail.com";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Unauthorized email" }, { status: 403 });
  }

  await connectDB();
  await UserModel.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { role: "admin" }
  );

  return Response.json({ ok: true, message: `Set admin for ${ADMIN_EMAIL}. Now sign out and back in.` });
}
