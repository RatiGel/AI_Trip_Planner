import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AdminConfigModel } from "@/lib/models/admin-config";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  await connectDB();
  const config = await AdminConfigModel.findOne({ key: "theme" }).lean();
  return NextResponse.json(config ?? { key: "theme", colors: {}, typography: {} });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await connectDB();
  const config = await AdminConfigModel.findOneAndUpdate(
    { key: "theme" },
    { $set: { colors: body.colors, typography: body.typography } },
    { upsert: true, new: true }
  );
  return NextResponse.json(config);
}
