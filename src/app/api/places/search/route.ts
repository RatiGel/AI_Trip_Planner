import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  await connectDB();
  const places = await PlaceModel.find({ name: { $regex: q, $options: "i" } })
    .select("name nameKa categories")
    .limit(20)
    .lean();

  return NextResponse.json(
    places.map((p: any) => ({
      id: String(p._id),
      name: p.name,
      nameKa: p.nameKa,
      category: p.categories?.[0] ?? "",
    }))
  );
}
