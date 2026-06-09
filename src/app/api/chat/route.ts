import { NextRequest, NextResponse } from "next/server";
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

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

const CHAT_SYSTEM = `You are a friendly AI travel assistant for Georgia (the country in the Caucasus), specializing in Tbilisi.

Be warm, concise, and conversational. When the user has given you BOTH their number of days AND their interests/preferences, include a <trip_plan> tag at the very end of your message with this exact JSON (no extra whitespace outside the tags):

<trip_plan>{"days":N,"interests":"user interests verbatim","pace":"relaxed|balanced|packed","categories":["museum","sight","cafe","restaurant","park","wine","shop","club"],"citySlug":"tbilisi","confirmationMessage":"Short friendly message like: Perfect! Here's your 3-day Tbilisi adventure — review the places below and confirm when you're happy!"}</trip_plan>

Rules:
- Only include categories that actually match the user's stated interests (omit unrelated ones).
- Pace: "relaxed" if they say slow/easy, "packed" if busy/full, otherwise "balanced".
- City: default "tbilisi" unless they name another Georgian city.
- Only output <trip_plan> when you truly have BOTH days AND interests. Ask for missing info first.
- Remove the <trip_plan> tag from any visible text — it is machine-readable only.`;

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

async function callOpenRouter(
  messages: { role: string; content: string }[],
): Promise<string> {
  async function attempt() {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 2000, temperature: 0.7 }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string | null } }> };
    return data.choices[0]?.message?.content ?? "";
  }

  // Model is a reasoning model; content can be null when reasoning exhausts tokens.
  // Retry once before giving up.
  const first = await attempt();
  if (first) return first;
  return await attempt();
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

  // ── Confirm stage ────────────────────────────────────────────────────
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
        placesById = new Map((itineraryPlaces as Place[]).map((p) => [p.id, p]));
      } else {
        await connectDB();
        const docs = await PlaceModel.find({ _id: { $in: selectedPlaceIds } }).lean();
        placesById = new Map(
          (docs as Record<string, unknown>[]).map(toPlace).map((p) => [p.id, p]),
        );
      }

      const plan = buildRoutePlan(pendingItinerary, placesById);
      const daysCount = pendingItinerary.days.length;
      const stopsCount = pendingItinerary.days.reduce((n, d) => n + d.stops.length, 0);

      return NextResponse.json({
        reply: `Your ${daysCount}-day itinerary with ${stopsCount} stops is ready! Here's your optimized route with arrival times.`,
        plan,
      });
    } catch (e) {
      console.error("[chat confirm]", e);
      return NextResponse.json({ error: "Failed to build itinerary" }, { status: 500 });
    }
  }

  // ── Chat messages path ───────────────────────────────────────────────
  const messages: ChatMessage[] = body.messages ?? [];
  const citySlug = body.citySlug ?? "tbilisi";

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const hasKey = !!process.env.OPENROUTER_API_KEY;

  // ── No API key: heuristic mock path ──────────────────────────────────
  if (!hasKey) {
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
          const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
          const previewPlaces = buildPreviewCards(itinerary, placesById);
          const chosenIds = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)));
          const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));
          return NextResponse.json({
            reply: `Here's a ${prefs.days}-day Tbilisi itinerary! Add OPENROUTER_API_KEY for personalized AI chat. Review the places below and confirm when you're happy!`,
            stage: "preview",
            previewPlaces,
            pendingItinerary: itinerary,
            itineraryPlaces,
            mock: true,
          });
        }
      } catch (e) {
        console.error("[chat mock]", e);
      }
    }

    return NextResponse.json({
      reply: "Tell me how many days you have and what you enjoy, and I'll build an itinerary! (Preview mode — add OPENROUTER_API_KEY for real AI)",
      mock: true,
    });
  }

  // ── OpenRouter path ──────────────────────────────────────────────────
  const orMessages = [
    { role: "system", content: CHAT_SYSTEM },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const rawReply = await callOpenRouter(orMessages);

    // When model returns empty after retries, fall back to heuristic extraction.
    if (!rawReply) {
      const lastUserMsg =
        [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      if (/\d+\s*day/i.test(lastUserMsg)) {
        const prefs = extractPrefsMock(lastUserMsg);
        prefs.citySlug = citySlug;
        const candidates = await getCandidatePlaces(prefs);
        if (candidates.length > 0) {
          const itinerary = await generateItinerary(prefs, candidates);
          const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
          const previewPlaces = buildPreviewCards(itinerary, placesById);
          const chosenIds = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)));
          const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));
          return NextResponse.json({
            reply: `Here's your ${prefs.days}-day Tbilisi itinerary! Review the places below and confirm when you're happy!`,
            stage: "preview",
            previewPlaces,
            pendingItinerary: itinerary,
            itineraryPlaces,
            mock: false,
          });
        }
      }
      return NextResponse.json({ reply: "Tell me how many days you have and what you enjoy!" });
    }

    // Extract <trip_plan> if present. Accept unclosed tags (model truncates occasionally).
    const planMatch = rawReply.match(/<trip_plan>([\s\S]*?)(?:<\/trip_plan>|$)/i);
    const visibleReply = rawReply.replace(/<trip_plan>[\s\S]*/gi, "").trim();

    if (planMatch) {
      let input: {
        days: number;
        interests: string;
        pace?: "relaxed" | "balanced" | "packed";
        categories?: CategorySlug[];
        citySlug?: string;
        confirmationMessage: string;
      };

      try {
        // Strip any outer XML wrapper the model may add around the JSON.
        const jsonStr = planMatch[1]
          .replace(/^[\s\S]*?({)/, "$1")   // drop anything before first {
          .replace(/}[\s\S]*$/, "}")        // drop anything after last }
          .trim();
        input = JSON.parse(jsonStr);
      } catch {
        // JSON parse failed — fall through to heuristic
        const lastUserMsg =
          [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
        if (/\d+\s*day/i.test(lastUserMsg)) {
          const prefs = extractPrefsMock(lastUserMsg);
          prefs.citySlug = citySlug;
          const candidates = await getCandidatePlaces(prefs);
          if (candidates.length > 0) {
            const itinerary = await generateItinerary(prefs, candidates);
            const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
            const previewPlaces = buildPreviewCards(itinerary, placesById);
            const chosenIds = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)));
            const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));
            return NextResponse.json({
              reply: `Here's your ${prefs.days}-day Tbilisi itinerary! Review the places below and confirm.`,
              stage: "preview",
              previewPlaces,
              pendingItinerary: itinerary,
              itineraryPlaces,
              mock: false,
            });
          }
        }
        return NextResponse.json({ reply: visibleReply || "Here's what I found for your trip!" });
      }

      const prefs: TravelPreferences = {
        citySlug: input.citySlug || citySlug,
        days: Math.min(7, Math.max(1, input.days)),
        interests: input.interests,
        pace: input.pace ?? "balanced",
        categories: input.categories,
      };

      const candidates = await getCandidatePlaces(prefs);
      if (candidates.length === 0) {
        return NextResponse.json({
          reply: "I couldn't find places for that destination. Try asking about Tbilisi!",
        });
      }

      const itinerary = await generateItinerary(prefs, candidates);
      const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
      const previewPlaces = buildPreviewCards(itinerary, placesById);
      const chosenIds = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)));
      const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));

      return NextResponse.json({
        reply: input.confirmationMessage || visibleReply,
        stage: "preview",
        previewPlaces,
        pendingItinerary: itinerary,
        itineraryPlaces,
        mock: false,
      });
    }

    return NextResponse.json({ reply: visibleReply || rawReply });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
