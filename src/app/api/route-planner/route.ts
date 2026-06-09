import { NextRequest, NextResponse } from "next/server";
import { getCandidatePlaces } from "@/lib/places/candidates";
import { generateItinerary } from "@/lib/ai/route-planner";
import { buildRoutePlan } from "@/lib/route/optimize";
import type { CategorySlug, Place, TravelPreferences } from "@/types";

export const runtime = "nodejs";

function parsePrefs(body: unknown): TravelPreferences | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const citySlug = typeof b.citySlug === "string" ? b.citySlug : "tbilisi";
  const days = Number(b.days);
  const interests = typeof b.interests === "string" ? b.interests.trim() : "";

  if (!Number.isFinite(days) || days < 1 || days > 7) return null;
  if (!interests) return null;

  const pace =
    b.pace === "relaxed" || b.pace === "packed" ? b.pace : "balanced";
  const categories = Array.isArray(b.categories)
    ? (b.categories.filter((c) => typeof c === "string") as CategorySlug[])
    : undefined;
  const dayStart = typeof b.dayStart === "string" ? b.dayStart : undefined;

  return { citySlug, days, interests, pace, categories, dayStart };
}

export async function POST(req: NextRequest) {
  let prefs: TravelPreferences | null;
  try {
    prefs = parsePrefs(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!prefs) {
    return NextResponse.json(
      { error: "Provide `interests` and `days` (1-7)." },
      { status: 400 },
    );
  }

  try {
    const candidates = await getCandidatePlaces(prefs);
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No places found for this city." },
        { status: 404 },
      );
    }

    const itinerary = await generateItinerary(prefs, candidates);
    const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
    const plan = buildRoutePlan(itinerary, placesById, { dayStart: prefs.dayStart });

    const isMock = !process.env.OPENROUTER_API_KEY;
    return NextResponse.json({ plan, mock: isMock });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("OPENROUTER_API_KEY")) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENROUTER_API_KEY." },
        { status: 503 },
      );
    }
    console.error("[route-planner]", err);
    return NextResponse.json(
      { error: "Failed to generate itinerary." },
      { status: 500 },
    );
  }
}
