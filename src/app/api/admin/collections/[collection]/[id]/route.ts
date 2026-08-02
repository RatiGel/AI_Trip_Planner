import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import "@/lib/models/index";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { collection, id } = await params;
  const body = await req.json();

  await connectDB();
  if (!mongoose.modelNames().includes(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }

  const model = mongoose.model(collection);
  const doc = await model.findByIdAndUpdate(id, { $set: body }, { new: true });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { collection, id } = await params;

  await connectDB();
  if (!mongoose.modelNames().includes(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }

  const model = mongoose.model(collection);
  await model.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
