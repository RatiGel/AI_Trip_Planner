import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({
      resetTokenHash: hashToken(token),
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
