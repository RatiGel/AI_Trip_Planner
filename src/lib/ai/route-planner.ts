import { toAICandidate } from "@/lib/places/candidates";
import type { AIItinerary, Place, TravelPreferences } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

const SYSTEM_PROMPT = `You are an expert local trip planner for tourism in Georgia (the country).

Your ONLY job is to plan a day-by-day itinerary by SELECTING places from a provided candidate list.

Hard rules:
- Every place_id you return MUST come exactly from the candidate list given in the user message.
- Do NOT invent places, coordinates, addresses, or distances.
- Choose places that match the traveller's stated interests.
- Prefer variety across categories within a day (mix a sight, food, and an evening spot).
- Distribute stops across the requested number of days: relaxed ~3 stops/day, balanced ~4, packed ~5-6.
- Give each stop a short, specific reason (one sentence) explaining why it fits this traveller.
- Do not reuse the same place on multiple days.

Output ONLY valid JSON wrapped in <itinerary> tags, with no other text before or after. The JSON must match this exact schema:

<itinerary>
{
  "title": "Short evocative trip title",
  "days": [
    {
      "day": 1,
      "stops": [
        { "place_id": "id_from_list", "reason": "One sentence why this fits the traveller." }
      ]
    }
  ]
}
</itinerary>`;

function buildUserMessage(prefs: TravelPreferences, candidates: Place[]): string {
  const list = candidates
    .map((p) => JSON.stringify(toAICandidate(p)))
    .join("\n");

  return [
    `Plan a ${prefs.days}-day trip.`,
    `Pace: ${prefs.pace ?? "balanced"}.`,
    `Traveller interests: ${prefs.interests}`,
    "",
    "Choose ONLY from these candidate places (JSON, one per line):",
    list,
  ].join("\n");
}

function parseItinerary(text: string): AIItinerary | null {
  const match = text.match(/<itinerary>([\s\S]*?)<\/itinerary>/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      typeof parsed.title === "string" &&
      Array.isArray(parsed.days) &&
      parsed.days.every(
        (d: unknown) =>
          d &&
          typeof d === "object" &&
          typeof (d as Record<string, unknown>).day === "number" &&
          Array.isArray((d as Record<string, unknown>).stops),
      )
    ) {
      return parsed as AIItinerary;
    }
  } catch {
    // fall through
  }
  return null;
}

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

export async function generateItinerary(
  prefs: TravelPreferences,
  candidates: Place[],
): Promise<AIItinerary> {
  const userMessage = buildUserMessage(prefs, candidates);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const text = await callOpenRouter(messages);
  const itinerary = parseItinerary(text);

  const validIds = new Set(candidates.map((c) => c.id));

  function applyFilter(itin: AIItinerary): AIItinerary {
    return {
      ...itin,
      days: itin.days
        .map((d) => ({ ...d, stops: d.stops.filter((s) => validIds.has(s.place_id)) }))
        .filter((d) => d.stops.length > 0),
    };
  }

  function hasStops(itin: AIItinerary): boolean {
    return itin.days.some((d) => d.stops.length > 0);
  }

  if (itinerary) {
    const filtered = applyFilter(itinerary);
    if (hasStops(filtered)) return filtered;
  }

  // Retry once — model may have hallucinated IDs on first attempt.
  const retryMessages = [
    ...messages,
    { role: "assistant", content: text },
    {
      role: "user",
      content:
        "IMPORTANT: every place_id you return MUST come exactly from the candidate list I gave you. Reply ONLY with the JSON wrapped in <itinerary>...</itinerary> tags.",
    },
  ];
  const retryText = await callOpenRouter(retryMessages);
  const retried = parseItinerary(retryText);
  if (retried) {
    const filtered = applyFilter(retried);
    if (hasStops(filtered)) return filtered;
  }

  // Final fallback: deterministic round-robin from top candidates.
  return buildFallbackItinerary(prefs, candidates);
}

function buildFallbackItinerary(
  prefs: TravelPreferences,
  candidates: Place[],
): AIItinerary {
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
