import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PricingPlanModel } from "@/lib/models/pricing-plan";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function GET() {
  await connectDB();
  const plans = await PricingPlanModel.find().sort({ order: 1 }).lean();
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const body = await req.json();
  await connectDB();
  const plan = await PricingPlanModel.create(body);
  return NextResponse.json(plan, { status: 201 });
}
