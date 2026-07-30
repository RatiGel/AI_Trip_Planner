import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import "@/lib/models/index";
import mongoose from "mongoose";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function GET() {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  await connectDB();
  const names = mongoose.modelNames().sort();
  return NextResponse.json(names);
}
