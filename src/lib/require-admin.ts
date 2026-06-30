import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAdmin(): Promise<
  { ok: true; role: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, role };
}
