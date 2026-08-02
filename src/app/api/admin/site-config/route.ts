import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteConfigModel } from "@/lib/models/site-config";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function GET() {
  await connectDB();
  const config = await SiteConfigModel.findOne({ key: "main" }).lean();
  return NextResponse.json(config ?? { key: "main", header: {}, footer: {}, pages: {} });
}

export async function POST(req: NextRequest) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const body = await req.json();
  await connectDB();
  const config = await SiteConfigModel.findOneAndUpdate(
    { key: "main" },
    { $set: { header: body.header, footer: body.footer, pages: body.pages } },
    { upsert: true, new: true }
  );
  return NextResponse.json(config);
}
