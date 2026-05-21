import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const category = searchParams.get("category");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (city) filter.citySlug = city;
  if (category) filter.categories = category;

  const places = await PlaceModel.find(filter).lean();
  return NextResponse.json(places);
}
