import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { auth } from "@/lib/auth";

async function loadOwnedTrip(id: string, userId: string) {
  await connectDB();
  const trip = await ItineraryModel.findById(id);
  if (!trip) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (trip.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { trip };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  return NextResponse.json(trip!.toObject());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!Array.isArray(body.days)) {
    return NextResponse.json({ error: "Days must be an array" }, { status: 400 });
  }

  trip!.title = title;
  trip!.days = body.days;
  await trip!.save();

  return NextResponse.json(trip!.toObject());
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  await ItineraryModel.findByIdAndDelete(id);
  return new NextResponse(null, { status: 204 });
}
