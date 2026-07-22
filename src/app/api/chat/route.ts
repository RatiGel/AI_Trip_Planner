import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { getCandidatePlaces } from "@/lib/places/candidates";
import { generateItinerary } from "@/lib/ai/route-planner";
import { aiClient, hasLLM, CHAT_MODEL } from "@/lib/ai/client";
import { buildRoutePlan } from "@/lib/route/optimize";
import { geocodeTbilisi } from "@/lib/transit/geocode";
import { planJourney } from "@/lib/transit/client";
import type {
  AIItinerary,
  CategorySlug,
  ChatMessage,
  Place,
  PlacePreviewCard,
  TravelPreferences,
} from "@/types";

export const runtime = "nodejs";

const CHAT_SYSTEM = `You are a travel assistant for Georgia (the country in the Caucasus), specializing in Tbilisi.

Talk like a real person — a knowledgeable local friend. Keep it natural, concise, and conversational. When the user has given you BOTH their number of days AND their interests/preferences, call the create_trip_plan tool to build their itinerary.

You're not a rigid form-filler. Think about what the user actually means and respond like a smart, well-traveled local would:
- Questions about Georgia, travel logistics, culture, food, safety, weather, visas, etc. — answer directly and helpfully from your own knowledge, even if it's not strictly about building an itinerary yet.
- Vague or ambiguous requests — ask a natural clarifying question instead of guessing or stalling.
- Genuinely off-topic questions (unrelated to Georgia or travel, e.g. math, trivia, coding) — give a brief, honest answer, then naturally bring the conversation back to their trip. Don't refuse and don't pretend you can't answer; just don't dwell there.
- Never act confused or repeat "I can only help with trip planning" — that's not how a real person talks.

Tone rules:
- Never use emoji or decorative icons. No ✨🗺️📍 etc. Plain text only.
- Don't be bubbly or salesy. No "Perfect!", "Amazing!", excessive exclamation marks, or filler enthusiasm. Write the way a thoughtful person actually speaks.
- Sound human, not like a brochure.

Rules:
- Only call create_trip_plan when you have BOTH the number of days AND what the user enjoys. Ask for missing info first.
- When the user asks how to get between two specific places WITHIN a city (e.g. "how do I get from Rustaveli to the airport?"), call plan_transit with the two place names. Do not use it for travel between different cities — that's the intercity tickets page.
- Pace: "relaxed" if they mention slow/easy, "packed" if busy/full/action, otherwise "balanced".
- City: default "tbilisi" unless they name another Georgian city.
- confirmationMessage: a short, plain message with no emoji, e.g. "Here's a 3-day Tbilisi plan based on what you're after — take a look and confirm if it works."
- Only include categories that genuinely match the stated interests.`;

const CREATE_TRIP_PLAN_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_trip_plan",
    description:
      "Call this when you have collected the user's trip duration and interests and are ready to generate their itinerary.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of travel days (1-7)" },
        interests: { type: "string", description: "User interests as described by the user" },
        pace: {
          type: "string",
          enum: ["relaxed", "balanced", "packed"],
          description: "Trip pace",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Relevant category slugs from: museum, sight, cafe, restaurant, park, wine, shop, club",
        },
        citySlug: {
          type: "string",
          description: "City slug — default: tbilisi",
        },
        confirmationMessage: {
          type: "string",
          description: "Short warm message shown to the user while the itinerary is being built",
        },
      },
      required: ["days", "interests", "confirmationMessage"],
    },
  },
};

const PLAN_TRANSIT_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "plan_transit",
    description:
      "Plan public-transit directions between two places within a city. Call when the user asks how to get from one place to another (walking + bus + metro).",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Origin place name, e.g. 'Rustaveli metro station'",
        },
        to: {
          type: "string",
          description: "Destination place name, e.g. 'Tbilisi International Airport'",
        },
      },
      required: ["from", "to"],
    },
  },
};

type TripPlanInput = {
  days: number;
  interests: string;
  pace?: "relaxed" | "balanced" | "packed";
  categories?: CategorySlug[];
  citySlug?: string;
  confirmationMessage: string;
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

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

async function buildPreview(
  input: TripPlanInput,
  fallbackCity: string,
): Promise<{
  reply: string;
  stage: "preview";
  previewPlaces: PlacePreviewCard[];
  pendingItinerary: AIItinerary;
  itineraryPlaces: Place[];
  mock: boolean;
} | null> {
  const prefs: TravelPreferences = {
    citySlug: input.citySlug || fallbackCity,
    days: Math.min(7, Math.max(1, input.days)),
    interests: input.interests,
    pace: input.pace ?? "balanced",
    categories: input.categories,
  };

  const candidates = await getCandidatePlaces(prefs);
  if (!candidates.length) return null;

  const itinerary = await generateItinerary(prefs, candidates);
  const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
  const previewPlaces = buildPreviewCards(itinerary, placesById);
  const chosenIds = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)));
  const itineraryPlaces = candidates.filter((c) => chosenIds.has(c.id));

  return {
    reply: input.confirmationMessage,
    stage: "preview",
    previewPlaces,
    pendingItinerary: itinerary,
    itineraryPlaces,
    mock: false,
  };
}

export async function POST(req: NextRequest) {
  let body: {
    messages?: ChatMessage[];
    citySlug?: string;
    stage?: "confirm";
    selectedPlaceIds?: string[];
    pendingItinerary?: AIItinerary;
    itineraryPlaces?: Place[];
    locale?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Confirm stage (non-streaming JSON) ───────────────────────────────
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
        reply: `Your ${daysCount}-day itinerary with ${stopsCount} stops is ready! Here's your optimized route.`,
        plan,
      });
    } catch (e) {
      console.error("[chat confirm]", e);
      return NextResponse.json({ error: "Failed to build itinerary" }, { status: 500 });
    }
  }

  // ── Chat stage (SSE streaming) ───────────────────────────────────────
  const messages: ChatMessage[] = body.messages ?? [];
  const citySlug = body.citySlug ?? "tbilisi";
  const locale = body.locale ?? "en";

  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // ── No API key: heuristic mock ───────────────────────────────────────
  if (!hasLLM) {
    (async () => {
      try {
        const lastUserMsg =
          [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const hasDays = /\d+\s*day/i.test(lastUserMsg) || messages.length >= 2;

        if (hasDays) {
          const prefs = extractPrefsMock(lastUserMsg);
          prefs.citySlug = citySlug;
          const candidates = await getCandidatePlaces(prefs);
          if (candidates.length > 0) {
            const itinerary = await generateItinerary(prefs, candidates);
            const placesById = new Map<string, Place>(candidates.map((p) => [p.id, p]));
            const previewPlaces = buildPreviewCards(itinerary, placesById);
            const chosenIds = new Set(
              itinerary.days.flatMap((d) => d.stops.map((s) => s.place_id)),
            );
            await writer.write(
              sse({
                type: "preview",
                reply: `Here's a ${prefs.days}-day Tbilisi itinerary! Add OPENROUTER_API_KEY for personalized AI chat.`,
                stage: "preview",
                previewPlaces,
                pendingItinerary: itinerary,
                itineraryPlaces: candidates.filter((c) => chosenIds.has(c.id)),
                mock: true,
              }),
            );
            await writer.write(sse({ type: "done" }));
            await writer.close();
            return;
          }
        }

        await writer.write(
          sse({
            type: "done",
            text: "Tell me how many days you have and what you enjoy, and I'll build an itinerary! (Add OPENROUTER_API_KEY for real AI)",
          }),
        );
        await writer.close();
      } catch (e) {
        console.error("[chat mock]", e);
        await writer.write(sse({ type: "error", message: "Failed to generate itinerary" }));
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // ── OpenRouter streaming (OpenAI-compatible) ─────────────────────────
  const chatMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  (async () => {
    try {
      const stream = await aiClient.chat.completions.create({
        model: CHAT_MODEL,
        max_tokens: 1024,
        tools: [CREATE_TRIP_PLAN_TOOL, PLAN_TRANSIT_TOOL],
        messages: [{ role: "system", content: CHAT_SYSTEM }, ...chatMessages],
        stream: true,
      });

      let toolName = "";
      let toolInputJson = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          await writer.write(sse({ type: "token", delta: delta.content }));
        }

        for (const toolCall of delta.tool_calls ?? []) {
          if (toolCall.function?.name) toolName = toolCall.function.name;
          if (toolCall.function?.arguments) toolInputJson += toolCall.function.arguments;
        }
      }

      if (toolName === "plan_transit" && toolInputJson) {
        try {
          const { from, to } = JSON.parse(toolInputJson) as { from?: string; to?: string };
          const transitFallback =
            "I couldn't find a route for that. Try the route planner on the Getting Around page.";
          if (!from || !to) {
            await writer.write(sse({ type: "done", text: transitFallback }));
          } else {
            const [fromHits, toHits] = await Promise.all([
              geocodeTbilisi(from),
              geocodeTbilisi(to),
            ]);
            const fromHit = fromHits[0];
            const toHit = toHits[0];
            if (!fromHit || !toHit) {
              await writer.write(sse({ type: "done", text: transitFallback }));
            } else {
              const plans = await planJourney(
                [fromHit.lat, fromHit.lng],
                [toHit.lat, toHit.lng],
                locale,
              );
              if (plans && plans.length > 0) {
                await writer.write(
                  sse({ type: "journey", plans, from, to }),
                );
              } else {
                await writer.write(sse({ type: "done", text: transitFallback }));
              }
            }
          }
        } catch (e) {
          console.error("[chat transit tool]", e);
          await writer.write(sse({ type: "done" }));
        }
      } else if (toolName === "create_trip_plan" && toolInputJson) {
        try {
          const toolInput = JSON.parse(toolInputJson) as TripPlanInput;
          const payload = await buildPreview(toolInput, citySlug);
          if (payload) {
            await writer.write(sse({ type: "preview", ...payload }));
          } else {
            await writer.write(
              sse({
                type: "done",
                text: "I couldn't find places for that destination. Try asking about Tbilisi!",
              }),
            );
          }
        } catch (e) {
          console.error("[chat tool parse]", e);
          await writer.write(sse({ type: "done" }));
        }
      } else {
        await writer.write(sse({ type: "done" }));
      }

      await writer.close();
    } catch (err) {
      console.error("[chat stream]", err);
      try {
        await writer.write(sse({ type: "error", message: "Failed to process message" }));
        await writer.close();
      } catch {
        // writer already closed
      }
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
