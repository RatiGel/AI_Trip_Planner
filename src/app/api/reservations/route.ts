import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ReservationModel } from "@/lib/models/reservation";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const reservations = await ReservationModel.find({
    userId: (session.user as { id?: string }).id,
  }).lean();
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { placeId, datetime, partySize, notes } = body;

    if (!placeId || !datetime || !partySize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const reservation = await ReservationModel.create({
      placeId,
      datetime,
      partySize,
      notes,
      userId: (session?.user as { id?: string } | undefined)?.id,
      status: "pending",
    });

    return NextResponse.json(reservation.toObject(), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
