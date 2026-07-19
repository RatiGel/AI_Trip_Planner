"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ExternalLink,
  Landmark,
  MapPin,
  MoonStar,
  Plus,
  Save,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RouteMap } from "@/components/planner/route-map";
import { ItinerarySidebar } from "@/components/planner/itinerary-sidebar";
import { PlaceSelectionCards } from "@/components/chat/place-selection-cards";
import { dayMapUrl } from "@/lib/google-maps";
import type { AIItinerary, ChatMessage, Place, PlacePreviewCard, RoutePlan } from "@/types";

type SseEvent =
  | { type: "token"; delta: string }
  | {
      type: "preview";
      reply: string;
      stage: "preview";
      previewPlaces: PlacePreviewCard[];
      pendingItinerary: AIItinerary;
      itineraryPlaces: Place[];
      mock: boolean;
    }
  | { type: "error"; message: string }
  | { type: "done"; text?: string };

const STARTER: ChatMessage = {
  id: "m-0",
  role: "assistant",
  content:
    "Hi! Tell me about your trip — how many days, what you love (museums, nightlife, coffee, hiking…). I'll build a personalized itinerary from real curated places.",
};

const EXAMPLE_ICONS = [Landmark, MoonStar, Users];

function AssistantAvatar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm ${className}`}
    >
      <Sparkles className="size-3.5" />
    </span>
  );
}

export function ChatUI() {
  const t = useTranslations("chat");
  const tp = useTranslations("planner");
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingMsg]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setStreamingMsg("");

    let accumulated = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      if (!res.body) {
        toast.error("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          if (!raw.startsWith("data: ")) continue;
          let payload: SseEvent;
          try {
            payload = JSON.parse(raw.slice(6)) as SseEvent;
          } catch {
            continue;
          }

          if (payload.type === "token") {
            accumulated += payload.delta;
            setStreamingMsg(accumulated);
          } else if (payload.type === "preview") {
            setStreamingMsg("");
            accumulated = "";
            setMessages((m) => [
              ...m,
              {
                id: `a-${Date.now()}`,
                role: "assistant" as const,
                content: payload.reply,
                type: "place-selection" as const,
                previewPlaces: payload.previewPlaces,
                pendingItinerary: payload.pendingItinerary,
                itineraryPlaces: payload.itineraryPlaces,
              },
            ]);
            setIsMock(payload.mock);
          } else if (payload.type === "error") {
            toast.error(payload.message ?? "Error generating response");
            setStreamingMsg("");
            accumulated = "";
          } else if (payload.type === "done") {
            const finalText = payload.text ?? accumulated;
            if (finalText.trim()) {
              setMessages((m) => [
                ...m,
                { id: `a-${Date.now()}`, role: "assistant" as const, content: finalText },
              ]);
            }
            setStreamingMsg("");
            accumulated = "";
          }
        }
      }
    } catch {
      toast.error("Failed to get a response");
      setStreamingMsg("");
    } finally {
      setPending(false);
    }
  }

  async function handleConfirm(
    selectedIds: string[],
    filteredItinerary: AIItinerary,
    selectedPlaces: Place[],
  ) {
    if (pending) return;
    setConfirming(true);
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "confirm",
          selectedPlaceIds: selectedIds,
          pendingItinerary: filteredItinerary,
          itineraryPlaces: selectedPlaces,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }
      const ts = Date.now();
      if (data.plan) {
        setMessages((m) => [
          ...m,
          { id: `a-${ts}`, role: "assistant" as const, content: data.reply },
          { id: `r-${ts}`, role: "assistant" as const, content: "", type: "route-plan" as const },
        ]);
        setPlan(data.plan as RoutePlan);
        setSelectedId(null);
        setSaved(false);
      } else {
        setMessages((m) => [
          ...m,
          { id: `a-${ts}`, role: "assistant" as const, content: data.reply },
        ]);
      }
    } catch {
      toast.error("Failed to build itinerary");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  function newChat() {
    setMessages([STARTER]);
    setInput("");
    setPlan(null);
    setSelectedId(null);
    setIsMock(false);
    setConfirming(false);
    setStreamingMsg("");
    setSaved(false);
  }

  async function saveTrip() {
    if (!plan) {
      toast.info("Plan your trip first, then save it.");
      return;
    }
    if (saving || saved) return;
    setSaving(true);

    const today = new Date();
    const days = plan.days.map((d) => ({
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + d.day - 1)
        .toISOString()
        .slice(0, 10),
      items: d.stops.map((s) => ({
        placeId: s.place.id,
        time: s.arrival,
        notes: s.reason,
      })),
    }));

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: plan.title, days }),
      });
      if (res.ok) {
        setSaved(true);
        toast.success("Trip saved! View it in My Trips.");
      } else if (res.status === 401) {
        toast.error("Sign in to save your trip.");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to save trip");
      }
    } catch {
      toast.error("Failed to save trip");
    } finally {
      setSaving(false);
    }
  }

  const latestPreviewIdx = messages.reduce(
    (best, m, i) => (m.type === "place-selection" ? i : best),
    -1,
  );

  const streamingBubble = streamingMsg ? (
    <div className="flex items-start gap-3">
      <AssistantAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground">
        {streamingMsg}
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#B5271D] align-middle" />
      </div>
    </div>
  ) : null;

  const dots =
    pending && !streamingMsg ? (
      <div className="flex items-center gap-3">
        <AssistantAvatar />
        <span className="inline-flex items-center gap-1">
          <span className="ai-think-dot size-1.5 rounded-full bg-[#B5271D]" />
          <span className="ai-think-dot size-1.5 rounded-full bg-[#B5271D] [animation-delay:150ms]" />
          <span className="ai-think-dot size-1.5 rounded-full bg-[#B5271D] [animation-delay:300ms]" />
        </span>
      </div>
    ) : null;

  const messageList = (
    <div className="space-y-6">
      {messages.map((m, idx) => (
        <div
          key={m.id}
          className={`chat-rise flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
        >
          {m.content && m.role === "assistant" && (
            <div className="flex w-full items-start gap-3">
              <AssistantAvatar className="mt-0.5" />
              <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground">
                {m.content}
              </div>
            </div>
          )}
          {m.content && m.role === "user" && (
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#E8A020] to-[#B5271D] px-4 py-2.5 text-[15px] font-medium leading-relaxed text-white shadow-md shadow-[#B5271D]/15">
              {m.content}
            </div>
          )}

          {m.type === "route-plan" && plan && (
            <div className="mt-2 w-full space-y-3 sm:pl-10">
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <div className="relative h-[400px]">
                  <RouteMap plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
                </div>
              </div>

              {/* Itinerary actions: save + open each day in Google Maps */}
              <div className="rounded-2xl border border-[#E8A020]/25 bg-card p-3 shadow-sm">
                <button
                  onClick={saveTrip}
                  disabled={saving || saved}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8A020] to-[#B5271D] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-[0.99] disabled:cursor-default disabled:opacity-80"
                >
                  {saved ? (
                    <>
                      <Check className="size-4" strokeWidth={3} /> {t("savedTrip")}
                    </>
                  ) : saving ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> {t("save")}
                    </>
                  )}
                </button>

                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ExternalLink className="size-3.5 text-[#E8A020]" />
                    {t("openInGoogleMaps")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.days.map((day) => {
                      const url = dayMapUrl(day, plan.mode);
                      if (!url) return null;
                      return (
                        <a
                          key={day.day}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8A020]/50 hover:shadow-sm"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: day.color }}
                          />
                          {tp("dayN", { n: day.day })}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {m.type === "place-selection" &&
            idx === latestPreviewIdx &&
            m.previewPlaces &&
            m.pendingItinerary &&
            !confirming && (
              <div className="w-full sm:pl-10">
                <PlaceSelectionCards
                  places={m.previewPlaces}
                  pendingItinerary={m.pendingItinerary}
                  pending={pending}
                  onConfirm={(ids, filtered) =>
                    handleConfirm(
                      ids,
                      filtered,
                      (m.itineraryPlaces ?? []).filter((p) => ids.includes(p.id)),
                    )
                  }
                />
              </div>
            )}
        </div>
      ))}
      {streamingBubble}
      {dots}
    </div>
  );

  const composer = (autoFocus: boolean) => (
    <div className="ai-composer relative flex items-end gap-2 rounded-3xl border border-border bg-card/90 p-2 shadow-lg shadow-black/[0.04] backdrop-blur-md">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("placeholder")}
        rows={1}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0"
      />
      <button
        onClick={send}
        disabled={pending || !input.trim()}
        aria-label={t("send")}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp className="size-4.5" strokeWidth={2.5} />
      </button>
    </div>
  );

  // ── Plan view ────────────────────────────────────────────────────────
  if (plan) {
    return (
      <div className="grid h-dvh grid-cols-1 pt-[72px] md:grid-cols-[1fr_340px]">
        <div className="flex flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
          <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <AssistantAvatar />
              <span className="text-sm font-semibold">{t("title")}</span>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={newChat} title={t("newChat")}>
                <Plus className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={saveTrip} title={t("save")}>
                <Save className="size-3.5" />
              </Button>
            </div>
          </div>

          {isMock && (
            <div className="flex shrink-0 items-center gap-2 border-b border-[#E8A020]/30 bg-[#E8A020]/10 px-4 py-2 text-xs text-[#92400e] dark:text-[#F5C842]">
              <span className="flex size-1.5 rounded-full bg-[#E8A020]" />
              Preview mode — add{" "}
              <code className="rounded bg-black/5 px-1 font-mono dark:bg-white/10">OPENROUTER_API_KEY</code> for real AI
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-3xl">{messageList}</div>
          </div>

          <div className="shrink-0 border-t border-border/70 bg-card/50 p-3 backdrop-blur">
            <div className="mx-auto max-w-3xl">{composer(false)}</div>
          </div>
        </div>

        <aside className="hidden overflow-hidden border-l border-border bg-card md:block">
          <ItinerarySidebar plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
      </div>
    );
  }

  // ── Default view ─────────────────────────────────────────────────────
  const onlyStarter = messages.length === 1;

  // Empty state: immersive centered hero with ambient brand glow.
  if (onlyStarter) {
    return (
      <div className="relative flex h-dvh flex-col overflow-hidden pt-[72px]">
        <div className="ai-ambient" aria-hidden />
        <div className="chat-texture pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="relative flex flex-1 flex-col items-center justify-center px-4">
          <div className="chat-rise flex w-full max-w-2xl flex-col items-center gap-8 text-center">
            <div className="space-y-4">
              <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#E8A020]/30 bg-[#E8A020]/[0.08] px-3.5 py-1.5 text-xs font-medium text-[#92400e] backdrop-blur dark:text-[#F5C842]">
                <MapPin className="size-3.5" />
                {t("location")}
              </span>
              <h1 className="font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05] tracking-tight [text-wrap:balance]">
                {t("title")}
              </h1>
              <p className="mx-auto max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>

            <div className="w-full">{composer(true)}</div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {[t("example1"), t("example2"), t("example3")].map((ex, i) => {
                const Icon = EXAMPLE_ICONS[i] ?? Sparkles;
                return (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className="chat-rise group inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card/70 py-2 pl-3 pr-4 text-[13px] font-medium leading-none backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8A020]/50 hover:bg-[#E8A020]/[0.06] hover:shadow-md"
                  >
                    <Icon className="size-4 text-[#B5271D] transition-transform duration-200 group-hover:scale-110 dark:text-[#F5C842]" />
                    {ex}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Conversation in progress (pre-plan): single centered column, glass composer.
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden pt-[72px]">
      <div className="ai-ambient opacity-60" aria-hidden />

      <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AssistantAvatar />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={newChat}>
              <Plus className="size-4" /> {t("newChat")}
            </Button>
            <Button
              size="sm"
              onClick={saveTrip}
              className="bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white hover:brightness-105"
            >
              <Save className="size-4" /> {t("save")}
            </Button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">{messageList}</div>
      </div>

      <div className="relative shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">{composer(false)}</div>
      </div>
    </div>
  );
}
