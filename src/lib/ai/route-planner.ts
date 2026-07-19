import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { aiClient, hasLLM, ITINERARY_MODEL } from "@/lib/ai/client";
import { toAICandidate } from "@/lib/places/candidates";
import type { AIItinerary, PlaceCandidate, TravelPreferences } from "@/types";

const SYSTEM_PROMPT = `You are an expert local trip planner for tourism in Georgia (the country in the Caucasus).

Your ONLY job is to plan a day-by-day itinerary by selecting places from a provided candidate list.

Rules:
- Every place_id you use MUST come exactly from the candidate list. Do NOT invent places.
- Choose places that match the traveller's stated interests.
- Prefer variety within each day: mix sights, food, and an evening spot.
- Distribute stops: relaxed ~3/day, balanced ~4/day, packed ~5-6/day.
- Give each stop a short specific reason (one sentence) explaining why it fits this traveller. Plain text, no emoji or icons.
- Do not reuse the same place across days.

Call the submit_itinerary tool to return your plan.`;

const ITINERARY_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_itinerary",
    description:
      "Submit the planned day-by-day itinerary. Use place_ids ONLY from the candidate list provided.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short evocative trip title" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    place_id: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["place_id", "reason"],
                },
              },
            },
            required: ["day", "stops"],
          },
        },
      },
      required: ["title", "days"],
    },
  },
};

function buildUserMessage(prefs: TravelPreferences, candidates: PlaceCandidate[]): string {
  const list = candidates.map((p) => JSON.stringify(toAICandidate(p))).join("\n");
  return [
    `Plan a ${prefs.days}-day trip.`,
    `Pace: ${prefs.pace ?? "balanced"}.`,
    `Traveller interests: ${prefs.interests}`,
    "",
    "Choose ONLY from these candidate places (one JSON object per line):",
    list,
  ].join("\n");
}

function applyFilter(itin: AIItinerary, validIds: Set<string>): AIItinerary {
  return {
    ...itin,
    days: itin.days
      .map((d) => ({ ...d, stops: d.stops.filter((s) => validIds.has(s.place_id)) }))
      .filter((d) => d.stops.length > 0),
  };
}

function buildFallbackItinerary(prefs: TravelPreferences, candidates: PlaceCandidate[]): AIItinerary {
  const stopsPerDay = prefs.pace === "relaxed" ? 3 : prefs.pace === "packed" ? 5 : 4;
  const days = [];
  let idx = 0;
  for (let d = 1; d <= prefs.days; d++) {
    const stops = [];
    for (let s = 0; s < stopsPerDay && idx < candidates.length; s++, idx++) {
      stops.push({ place_id: candidates[idx].id, reason: "Highly rated local spot." });
    }
    if (stops.length > 0) days.push({ day: d, stops });
  }
  return { title: `${prefs.days}-Day Tbilisi Trip`, days };
}

export async function generateItinerary(
  prefs: TravelPreferences,
  candidates: PlaceCandidate[],
): Promise<AIItinerary> {
  if (!hasLLM) {
    return buildFallbackItinerary(prefs, candidates);
  }

  const validIds = new Set(candidates.map((c) => c.id));

  try {
    const response = await aiClient.chat.completions.create({
      model: ITINERARY_MODEL,
      max_tokens: 2048,
      tools: [ITINERARY_TOOL],
      tool_choice: "required",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(prefs, candidates) },
      ],
    });

    const toolCall = response.choices[0]?.message.tool_calls?.find(
      (t) => t.type === "function" && t.function.name === "submit_itinerary",
    );

    if (toolCall?.type === "function") {
      const input = JSON.parse(toolCall.function.arguments) as AIItinerary;
      const filtered = applyFilter(input, validIds);
      if (filtered.days.some((d) => d.stops.length > 0)) return filtered;
    }
  } catch (e) {
    console.error("[generateItinerary]", e);
  }

  return buildFallbackItinerary(prefs, candidates);
}
