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

  // Only set keys that were actually provided so a partial save (e.g. just the
  // listing fee from the pricing page) doesn't wipe header/footer/pages.
  const set: Record<string, unknown> = {};
  if (body.header !== undefined) set.header = body.header;
  if (body.footer !== undefined) set.footer = body.footer;
  if (body.pages !== undefined) set.pages = body.pages;
  if (body.listingFeeTetri !== undefined) {
    const tetri = Math.round(Number(body.listingFeeTetri));
    if (!Number.isFinite(tetri) || tetri < 0) {
      return NextResponse.json({ error: "Invalid listing fee" }, { status: 400 });
    }
    set.listingFeeTetri = tetri;
  }

  const config = await SiteConfigModel.findOneAndUpdate(
    { key: "main" },
    { $set: set },
    { upsert: true, new: true }
  );
  return NextResponse.json(config);
}
