import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await connectDB();
  const city = await CityModel.findOne({ slug }).lean();
  if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(city);
}
