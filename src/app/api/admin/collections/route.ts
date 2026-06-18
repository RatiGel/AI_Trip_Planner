import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import "@/lib/models/index";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await connectDB();
  const names = mongoose.modelNames().sort();
  return NextResponse.json(names);
}
