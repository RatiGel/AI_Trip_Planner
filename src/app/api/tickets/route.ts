import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TicketModel } from "@/lib/models/ticket";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (from) filter.from = from;
  if (to) filter.to = to;

  const tickets = await TicketModel.find(filter).lean();
  return NextResponse.json(tickets);
}
