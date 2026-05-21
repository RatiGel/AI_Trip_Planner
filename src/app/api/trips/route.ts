import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const trips = await ItineraryModel.find({
    userId: (session.user as { id?: string }).id,
  })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, days } = await req.json();
    if (!title || !days) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const trip = await ItineraryModel.create({
      title,
      days,
      userId: (session.user as { id?: string }).id,
    });

    return NextResponse.json(trip.toObject(), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
