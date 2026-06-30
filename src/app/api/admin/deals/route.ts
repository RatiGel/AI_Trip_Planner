import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await connectDB();
  const deals = await DealModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await connectDB();
  // Owner (admin) created deals go live immediately.
  const deal = await DealModel.create({ ...body, status: "approved", ownerId: undefined });
  return NextResponse.json(deal, { status: 201 });
}
