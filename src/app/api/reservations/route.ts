import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ReservationModel } from "@/lib/models/reservation";
import { PlaceModel } from "@/lib/models/place";
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

    // Booking fee is set by the business on the place; copy it server-side
    // so the client cannot tamper with the amount.
    const place = await PlaceModel.findById(placeId)
      .select("reservationPriceGEL")
      .lean<{ reservationPriceGEL?: number }>();
    const priceGEL = place?.reservationPriceGEL ?? 0;

    const reservation = await ReservationModel.create({
      placeId,
      datetime,
      partySize,
      notes,
      userId: (session?.user as { id?: string } | undefined)?.id,
      status: "pending",
      priceGEL: priceGEL > 0 ? priceGEL : undefined,
      paymentStatus: "unpaid",
    });

    const obj = reservation.toObject();
    return NextResponse.json(
      { ...obj, id: String(obj._id), requiresPayment: priceGEL > 0 },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
