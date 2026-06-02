import Anthropic from "@anthropic-ai/sdk";
import { toAICandidate } from "@/lib/places/candidates";
import type { AIItinerary, Place, TravelPreferences } from "@/types";

// Skill mandate: default to the most capable model unless the user picks another.
const MODEL = "claude-opus-4-8";

/**
 * The system prompt is FROZEN — no per-request interpolation — so it sits at
 * the front of the cached prefix. Volatile content (candidates, preferences)
 * goes in the user turn, after the cache breakpoint. See shared/prompt-caching.
 */
const SYSTEM_PROMPT = `You are an expert local trip planner for tourism in Georgia (the country).

Your ONLY job is to plan a day-by-day itinerary by SELECTING places from a provided candidate list. You are responsible for itinerary planning only.

Hard rules:
- You MUST NOT invent places. Every place_id you return MUST come from the candidate list given in the user message.
- You MUST NOT output coordinates, addresses, distances, travel times, or any geographic data. Those come from the application's database, not from you.
- Choose places that genuinely match the traveller's stated interests. Prefer variety across categories within a day (e.g. mix a sight, food, and an evening spot) over repetition.
- Distribute stops sensibly across the requested number of days. A relaxed pace means ~3 stops/day, balanced ~4, packed ~5-6.
- Give each stop a short, specific reason (one sentence) explaining why it fits this traveller.
- Do not reuse the same place on multiple days.

Return your plan by calling the submit_itinerary tool. Do not write any prose outside the tool call.`;

const ITINERARY_TOOL: Anthropic.Tool = {
  name: "submit_itinerary",
  description:
    "Submit the finished day-by-day itinerary. Every place_id must be from the candidate list.",
  // strict mode → all properties required, additionalProperties:false everywhere.
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        description: "Short, evocative title for the trip.",
      },
      days: {
        type: "array",
        description: "One entry per day, in order.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            day: { type: "integer", description: "1-based day number." },
            stops: {
              type: "array",
              description: "Ordered stops for this day.",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  place_id: {
                    type: "string",
                    description: "An id from the candidate list. Required.",
                  },
                  reason: {
                    type: "string",
                    description: "One sentence on why this fits the traveller.",
                  },
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
};

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

// ── Groq (free tier) ─────────────────────────────────────────────────
// Uses llama-3.3-70b-versatile via Groq's OpenAI-compatible API.
// Free at console.groq.com — no credit card, 14,400 req/day.

const GROQ_SYSTEM = `You are an expert local trip planner for Tbilisi, Georgia.
Select places from the candidate list and return a JSON itinerary.

Rules:
- Every place_id MUST come exactly from the candidate list provided
- NEVER invent place ids; if unsure, skip rather than guess
- NO coordinates, addresses, distances, or geographic data
- Prefer variety across categories within each day
- Relaxed pace ~3 stops/day, balanced ~4, packed ~5-6
- Give each stop a one-sentence reason explaining why it fits the traveller
- Do not reuse the same place on multiple days

Return ONLY valid JSON matching this exact schema (no markdown, no prose):
{"title":"string","days":[{"day":1,"stops":[{"place_id":"string","reason":"string"}]}]}`;

async function generateWithGroq(
  prefs: TravelPreferences,
  candidates: Place[],
): Promise<AIItinerary> {
  const list = candidates.map((p) => JSON.stringify(toAICandidate(p))).join("\n");

  const userMsg = [
    `Plan a ${prefs.days}-day trip. Pace: ${prefs.pace ?? "balanced"}.`,
    `Traveller interests: ${prefs.interests}`,
    "",
    "Choose ONLY from these candidate places (one JSON object per line):",
    list,
  ].join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: GROQ_SYSTEM },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as AIItinerary;
}

// ── Mock mode ────────────────────────────────────────────────────────
// Active when ANTHROPIC_API_KEY is absent OR USE_MOCK_AI=true.
// Distributes top-ranked candidates evenly across days without any API call,
// letting you test the full pipeline (DB → optimize → map → sidebar) for free.

const STOPS_PER_DAY: Record<string, number> = {
  relaxed: 3,
  balanced: 4,
  packed: 5,
};

function mockItinerary(prefs: TravelPreferences, candidates: Place[]): AIItinerary {
  const perDay = STOPS_PER_DAY[prefs.pace ?? "balanced"];
  const needed = prefs.days * perDay;
  const pool = candidates.slice(0, Math.min(needed, candidates.length));

  const days = Array.from({ length: prefs.days }, (_, i) => {
    const slice = pool.slice(i * perDay, i * perDay + perDay);
    return {
      day: i + 1,
      stops: slice.map((p) => ({
        place_id: p.id,
        reason: `[mock] ${p.categories[0] ?? "place"} — ${p.name}`,
      })),
    };
  }).filter((d) => d.stops.length > 0);

  return { title: `${prefs.days}-Day Tbilisi Preview (mock)`, days };
}

// ─────────────────────────────────────────────────────────────────────

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic();
  return client;
}

/**
 * STEP 3-4 of the backend flow: send candidates to the AI and receive an
 * itinerary of place IDs. The response is validated against the candidate set
 * — unknown ids are dropped, empty days removed.
 *
 * Falls back to mock mode when ANTHROPIC_API_KEY is absent or USE_MOCK_AI=true.
 */
export async function generateItinerary(
  prefs: TravelPreferences,
  candidates: Place[],
): Promise<AIItinerary> {
  // Explicit mock override.
  if (process.env.USE_MOCK_AI === "true") {
    return mockItinerary(prefs, candidates);
  }

  // Groq free tier (llama-3.3-70b) — active when GROQ_API_KEY is set.
  if (process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    const validIds = new Set(candidates.map((c) => c.id));
    const raw = await generateWithGroq(prefs, candidates);
    const usedIds = new Set<string>();
    const days = (raw.days ?? [])
      .map((d) => ({
        day: d.day,
        stops: (d.stops ?? []).filter((s) => {
          if (!validIds.has(s.place_id) || usedIds.has(s.place_id)) return false;
          usedIds.add(s.place_id);
          return true;
        }),
      }))
      .filter((d) => d.stops.length > 0);
    if (days.length === 0) throw new Error("Groq itinerary contained no valid places");
    return { title: raw.title ?? "Your Trip", days };
  }

  // No key at all → mock.
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockItinerary(prefs, candidates);
  }

  const anthropic = getClient();
  const validIds = new Set(candidates.map((c) => c.id));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    // Force the tool so the model cannot reply with prose.
    tool_choice: { type: "tool", name: "submit_itinerary" },
    tools: [ITINERARY_TOOL],
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }, // cache the frozen prefix (tools + system)
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(prefs, candidates) }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("AI did not return an itinerary");

  const raw = toolUse.input as AIItinerary;

  // Guard against hallucinated ids and empty days.
  const days = (raw.days ?? [])
    .map((d) => ({
      day: d.day,
      stops: (d.stops ?? []).filter((s) => validIds.has(s.place_id)),
    }))
    .filter((d) => d.stops.length > 0);

  if (days.length === 0) {
    throw new Error("AI itinerary contained no valid places");
  }

  return { title: raw.title ?? "Your Trip", days };
}
