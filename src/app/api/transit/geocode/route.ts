import { NextRequest, NextResponse } from "next/server";
import { geocodeTbilisi, reverseGeocode } from "@/lib/transit/geocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const locale = params.get("locale") ?? "en";
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");

  // Reverse geocode when both coords are present and finite.
  if (latRaw !== null && lngRaw !== null) {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const result = await reverseGeocode(lat, lng, locale);
      return NextResponse.json(result);
    }
  }

  // Forward geocode (existing behavior).
  const q = params.get("q")?.trim() ?? "";
  const data = await geocodeTbilisi(q, locale);
  return NextResponse.json(data);
}
