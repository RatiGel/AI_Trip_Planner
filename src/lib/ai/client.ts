import OpenAI from "openai";

/**
 * LLM client for the AI chat + itinerary planner.
 *
 * Routes through OpenRouter's OpenAI-compatible Chat Completions API
 * (https://openrouter.ai/api/v1 → /chat/completions). Free-tier models
 * (Llama, Qwen, Gemma, GPT-OSS, Nemotron, etc.) are only served over this
 * OpenAI-style wire format, not Anthropic's Messages API — so this client
 * always speaks OpenAI, regardless of which underlying model is picked.
 */

const openRouterKey = process.env.OPENROUTER_API_KEY;

/** True when an LLM provider is configured. Gates the mock-mode fallback. */
export const hasLLM = !!openRouterKey;

export const aiClient = new OpenAI({
  apiKey: openRouterKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    // Optional OpenRouter attribution headers.
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-trip-planner-six-beta.vercel.app",
    "X-Title": "Tbilisi Trip Planner",
  },
});

/** Conversational model — decides when enough info exists to plan a trip. */
export const CHAT_MODEL = "openai/gpt-oss-20b:free";

/** Itinerary model — tool-forced structured output from candidates. */
export const ITINERARY_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
