import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PricingPlanModel } from "@/lib/models/pricing-plan";
import { requireAdmin } from "@/lib/require-admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  await connectDB();
  const plan = await PricingPlanModel.findByIdAndUpdate(id, body, { new: true });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();
  await PricingPlanModel.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
