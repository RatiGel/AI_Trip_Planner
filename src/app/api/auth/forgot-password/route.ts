import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { sendPasswordResetEmail } from "@/lib/email";

const TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, locale } = await req.json();
    const generic = NextResponse.json({ ok: true });

    if (!email || typeof email !== "string") return generic;

    await connectDB();
    const normalized = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalized });

    // Only users with a password (not OAuth-only) can reset. No enumeration: always generic.
    if (!user || !user.password) return generic;

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(rawToken);
    user.resetTokenExpiry = new Date(Date.now() + TTL_MS);
    await user.save();

    const lang = ["en", "ka", "ru"].includes(locale) ? locale : "en";
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = `${base}/${lang}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(normalized, link, lang);
    } catch (err) {
      console.error("Password reset email failed:", err);
      // Still return generic 200 — do not leak send failures.
    }

    return generic;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
