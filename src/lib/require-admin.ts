import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type AdminUser = { id?: string; email?: string; role?: string };

export async function requireAdmin(): Promise<
  { ok: true; role: string; user: AdminUser } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const user = session?.user as AdminUser | undefined;
  if (!user || user.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, role: user.role, user };
}
