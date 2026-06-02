import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { getCandidatePlaces } from "@/lib/places/candidates";
import { generateItinerary } from "@/lib/ai/route-planner";
import { buildRoutePlan } from "@/lib/route/optimize";
import type {
  AIItinerary,
  CategorySlug,
  ChatMessage,
  Place,
  PlacePreviewCard,
  TravelPreferences,
} from "@/types";

export const runtime = "nodejs";

const CHAT_SYSTEM = `You are an AI travel assistant for Georgia (the country in the Caucasus). Help tourists plan trips to Georgian cities, especially Tbilisi.

Be warm, concise, and conversational. When the user provides their number of days AND interests/preferences, call create_trip_plan immediately to generate a real itinerary. Do not ask follow-up questions if you already have days + interests.

Required to generate a plan:
- Number of days (1-7)
- What they enjoy or want to see

Pace inference: "relaxed/slow" = relaxed, "full/busy/packed" = packed, default = balanced.
City: default tbilisi unless they specify another Georgian city.`;

const CREATE_PLAN_TOOL: Anthropic.Tool = {
  name: "create_trip_plan",
  description:
    "Generate a personalized day-by-day trip itinerary once you know the user's days and interests",
  input_schema: {
    type: "object",
    properties: {
      citySlug: {
        type: "string",
        description: "City slug, default 'tbilisi'",
      },
      days: {
        type: "integer",
        description: "Number of days (1-7)",
      },
      interests: {
        type: "string",
        description: "User's interests and preferences in natural language",
      },
      pace: {
        type: "string",
        enum: ["relaxed", "balanced", "packed"],
      },
      categories: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "museum",
            "sight",
            "cafe",
            "club",
            "restaurant",
            "park",
            "shop",
            "wine",
          ],
        },
      },
      confirmationMessage: {
        type: "string",
        description:
          "Short friendly message to show while generating (e.g. 'Perfect! Here's your 3-day Tbilisi adventure — review the places below and confirm when you're happy!')",
      },
    },
    required: ["days", "interests", "confirmationMessage"],
  },
};

function extractPrefsMock(message: string): TravelPreferences {
  const daysMatch = message.match(/(\d+)\s*day/i);
  const days = daysMatch ? Math.min(7, Math.max(1, parseInt(daysMatch[1]))) : 2;
  const pace =
    /relax|slow/i.test(message)
      ? "relaxed"
      : /pack|full|busy/i.test(message)
        ? "packed"
        : "balanced";
  return { citySlug: "tbilisi", days, interests: message, pace };
}

function buildPreviewCards(
  itinerary: AIItinerary,
  placesById: Map<string, Place>,
): PlacePreviewCard[] {
  const cards: PlacePreviewCard[] = [];
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      const place = placesById.get(stop.place_id);
      if (!place) continue;
      cards.push({
        placeId: place.id,
        name: place.name,
        nameKa: place.nameKa ?? place.name,
        category: (place.categories[0] ?? "sight") as CategorySlug,
        imageUrl: place.images[0],
        rating: place.rating,
        reviewCount: place.reviewCount,
        description: place.description?.slice(0, 120) ?? "",
        reason: stop.reason,
        day: day.day,
      });
    }
  }
  return cards;
}

function toPlace(doc: Record<string, unknown>): Place {
  const { _id, ...rest } = doc;
  return { ...(rest as Omit<Place, "id">), id: String(_id) };
}

export async function POST(req: NextRequest) {
  let body: {
    messages?: ChatMessage[];
    citySlug?: string;
    stage?: "confirm";
    selectedPlaceIds?: string[];
    pendingItinerary?: AIItinerary;
    itineraryPlaces?: Place[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Confirm stage: user approved their place selection ───────────────
  if (body.stage === "confirm") {
    const { selectedPlaceIds, pendingItinerary, itineraryPlaces } = body;
    if (!selectedPlaceIds?.length || !pendingItinerary) {
      return NextResponse.json(
        { error: "Missing selectedPlaceIds or pendingItinerary" },
        { status: 400 },
      );
    }

    try {
      let placesById: Map<string, Place>;

      if (itineraryPlaces?.length) {
        // Use the place data sent with the request (no DB round-trip needed)
        placesById = new Map((itineraryPlaces as Place[]).map((p) => [p.id, p]));
      } else {
        // Fallback: re-fetch from DB
        await connectDB();
        const docs = await PlaceModel.find({
          _id: { $in: selectedPlaceIds },
        }).lean();
        placesById = new Map(
          (docs as Record<string, unknown>[]).map(toPlace).map((p) => [p.id, p]),
        );
      }

      const plan = buildRoutePlan(pendingItinerary, placesById);

      const daysCount = pendingItinerary.days.length;
      const stopsCount = pendingItinerary.days.reduce(
        (n, d) => n + d.stops.length,
        0,
      );
      return NextResponse.json({
        reply: `Your ${daysCount}-day itinerary with ${stopsCount} stops is ready! Here's your optimized route with arrival times and walking directions.`,
        plan,
      });
    } catch (e) {
      console.error("[chat confirm]", e);
      return NextResponse.json(
        { error: "Failed to build itinerary" },
        { status: 500 },
      );
    }
  }

  // ── Chat messages path ───────────────────────────────────────────────
  const messages: ChatMessage[] = body.messages ?? [];
  const citySlug = body.citySlug ?? "tbilisi";

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const isMock = process.env.USE_MOCK_AI === "true" || !hasAnthropicKey;

  // ── Non-Claude path: keyword extraction + GROQ/mock ─────────────────
  if (isMock) {
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const hasDays = /\d+\s*day/i.test(lastUserMsg) || messages.length >= 2;

    if (hasDays) {
      try {
        const prefs = extractPrefsMock(lastUserMsg);
        prefs.citySlug = citySlug;
        const candidates = await getCandidatePlaces(prefs);
        if (candidates.length > 0) {
          const itinerary = await generateItinerary(prefs, candidates);
          const placesById = new Map<string, Place>(
            candidates.map((p) => [p.id, p]),
          );
          const previewPlaces = buildPreviewCards(itinerary, placesById);
          const chosenIds = new Set(
            itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)),
          );
          const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));
          const isGroq = !!process.env.GROQ_API_KEY;
          const modeNote = isGroq
            ? ""
            : " (Preview mode — add ANTHROPIC_API_KEY for personalized AI chat)";
          return NextResponse.json({
            reply: `Here's a ${prefs.days}-day Tbilisi itinerary I've put together for you.${modeNote} Review the suggested places and confirm when you're happy!`,
            stage: "preview",
            previewPlaces,
            pendingItinerary: itinerary,
            itineraryPlaces,
            mock: !isGroq,
          });
        }
      } catch (e) {
        console.error("[chat mock]", e);
      }
    }

    return NextResponse.json({
      reply:
        "Tell me how many days you have and what you enjoy, and I'll build an itinerary! (Preview mode)",
      mock: true,
    });
  }

  // ── Real Claude path ─────────────────────────────────────────────────
  const anthropic = new Anthropic();
  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: CHAT_SYSTEM,
      tools: [CREATE_PLAN_TOOL],
      tool_choice: { type: "auto" },
      messages: anthropicMessages,
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === "create_trip_plan",
    );
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );

    if (toolUse) {
      const input = toolUse.input as {
        days: number;
        interests: string;
        pace?: "relaxed" | "balanced" | "packed";
        categories?: CategorySlug[];
        citySlug?: string;
        confirmationMessage: string;
      };

      const prefs: TravelPreferences = {
        citySlug: input.citySlug || citySlug,
        days: input.days,
        interests: input.interests,
        pace: input.pace ?? "balanced",
        categories: input.categories,
      };

      const candidates = await getCandidatePlaces(prefs);
      if (candidates.length === 0) {
        return NextResponse.json({
          reply:
            "I couldn't find places for that destination. Try asking about Tbilisi!",
        });
      }

      const itinerary = await generateItinerary(prefs, candidates);
      const placesById = new Map<string, Place>(
        candidates.map((p) => [p.id, p]),
      );
      const previewPlaces = buildPreviewCards(itinerary, placesById);
      const chosenIds = new Set(
        itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)),
      );
      const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));

      const isMockPlan =
        process.env.USE_MOCK_AI === "true" ||
        (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY);

      return NextResponse.json({
        reply: input.confirmationMessage,
        stage: "preview",
        previewPlaces,
        pendingItinerary: itinerary,
        itineraryPlaces,
        mock: isMockPlan,
      });
    }

    const reply =
      textBlock?.text ??
      "Tell me how many days you have and what you enjoy, and I'll build a personalized itinerary!";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
