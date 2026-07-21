import { NextRequest, NextResponse } from "next/server";
import { getArrivals } from "@/lib/transit/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const stopId = req.nextUrl.searchParams.get("stopId")?.trim();
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  if (!stopId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const arrivals = await getArrivals(stopId, locale);
  if (arrivals === null) {
    return NextResponse.json({ error: "transit_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ arrivals });
}
