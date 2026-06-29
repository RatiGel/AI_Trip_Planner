import Anthropic from "@anthropic-ai/sdk";

/**
 * LLM client for the AI chat + itinerary planner.
 *
 * Routes through OpenRouter's Anthropic-compatible Messages API when
 * OPENROUTER_API_KEY is set (https://openrouter.ai/api → /v1/messages,
 * with native tool-use + streaming passthrough). Falls back to the direct
 * Anthropic API when only ANTHROPIC_API_KEY is set.
 *
 * Model IDs differ per provider: OpenRouter uses "anthropic/<slug>",
 * the direct Anthropic API uses bare IDs.
 */

const openRouterKey = process.env.OPENROUTER_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

const useOpenRouter = !!openRouterKey;

/** True when any LLM provider is configured. Gates the mock-mode fallback. */
export const hasLLM = useOpenRouter || !!anthropicKey;

export const aiClient = new Anthropic(
  useOpenRouter
    ? {
        apiKey: openRouterKey,
        baseURL: "https://openrouter.ai/api",
        defaultHeaders: {
          // Optional OpenRouter attribution headers.
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-trip-planner-six-beta.vercel.app",
          "X-Title": "Tbilisi Trip Planner",
        },
      }
    : { apiKey: anthropicKey },
);

/** Conversational model — decides when enough info exists to plan a trip. */
export const CHAT_MODEL = useOpenRouter
  ? "anthropic/claude-sonnet-4.6"
  : "claude-sonnet-4-6";

/** Itinerary model — fast, tool-forced structured output from candidates. */
export const ITINERARY_MODEL = useOpenRouter
  ? "anthropic/claude-haiku-4.5"
  : "claude-haiku-4-5";
