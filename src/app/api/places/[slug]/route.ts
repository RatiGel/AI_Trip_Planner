import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await connectDB();
  const place = await PlaceModel.findOne({ slug }).lean();
  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(place);
}
