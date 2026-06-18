import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteConfigModel } from "@/lib/models/site-config";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  await connectDB();
  const config = await SiteConfigModel.findOne({ key: "main" }).lean();
  return NextResponse.json(config ?? { key: "main", header: {}, footer: {}, pages: {} });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await connectDB();
  const config = await SiteConfigModel.findOneAndUpdate(
    { key: "main" },
    { $set: { header: body.header, footer: body.footer, pages: body.pages } },
    { upsert: true, new: true }
  );
  return NextResponse.json(config);
}
