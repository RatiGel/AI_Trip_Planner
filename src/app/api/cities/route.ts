import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";

export async function GET() {
  await connectDB();
  const cities = await CityModel.find().lean();
  return NextResponse.json(cities);
}
