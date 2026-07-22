import { NextRequest, NextResponse } from "next/server";
import { geocodeTbilisi } from "@/lib/transit/geocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const data = await geocodeTbilisi(q);
  return NextResponse.json(data);
}
