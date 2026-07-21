import { NextRequest, NextResponse } from "next/server";
import { planJourney } from "@/lib/transit/client";
import type { LatLng } from "@/types/transit";

export const runtime = "nodejs";

function toLatLng(v: unknown): LatLng | null {
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number"
  ) {
    return [v[0], v[1]];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const from = toLatLng((body as Record<string, unknown>)?.from);
  const to = toLatLng((body as Record<string, unknown>)?.to);
  const locale =
    typeof (body as Record<string, unknown>)?.locale === "string"
      ? ((body as Record<string, unknown>).locale as string)
      : "en";

  if (!from || !to) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const plans = await planJourney(from, to, locale);
  if (plans === null) {
    return NextResponse.json({ error: "transit_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ plans });
}
