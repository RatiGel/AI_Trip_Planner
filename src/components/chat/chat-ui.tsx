"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Save, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RouteMap } from "@/components/planner/route-map";
import { ItinerarySidebar } from "@/components/planner/itinerary-sidebar";
import { PlaceSelectionCards } from "@/components/chat/place-selection-cards";
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

export function ChatUI() {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
  }

  async function saveTrip() {
    if (!plan) {
      toast.info("Plan your trip first, then save it.");
      return;
    }

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
        toast.success("Trip saved! View it in My Trips.");
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? "Failed to save trip");
      }
    } catch {
      toast.error("Failed to save trip");
    }
  }

  const latestPreviewIdx = messages.reduce(
    (best, m, i) => (m.type === "place-selection" ? i : best),
    -1,
  );

  const streamingBubble = streamingMsg ? (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm">
        <Sparkles className="size-3.5" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
        {streamingMsg}
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[#B5271D] align-middle" />
      </div>
    </div>
  ) : null;

  const dots =
    pending && !streamingMsg ? (
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </span>
        <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-3 shadow-sm">
          <span className="inline-flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-[#B5271D]/70" />
            <span className="size-1.5 animate-bounce rounded-full bg-[#B5271D]/70 [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[#B5271D]/70 [animation-delay:240ms]" />
          </span>
        </div>
      </div>
    ) : null;

  const messageList = (
    <div className="space-y-4">
      {messages.map((m, idx) => (
        <div
          key={m.id}
          className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
        >
          {m.content && m.role === "assistant" && (
            <div className="flex max-w-[88%] items-start gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm">
                <Sparkles className="size-3.5" />
              </span>
              <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                {m.content}
              </div>
            </div>
          )}
          {m.content && m.role === "user" && (
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-[#E8A020] to-[#B5271D] px-4 py-2.5 text-sm font-medium leading-relaxed text-white shadow-md">
              {m.content}
            </div>
          )}

          {m.type === "route-plan" && plan && (
            <div className="mt-1 w-full overflow-hidden rounded-2xl border border-border shadow-sm">
              <div className="relative h-[400px]">
                <RouteMap plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </div>
          )}

          {m.type === "place-selection" &&
            idx === latestPreviewIdx &&
            m.previewPlaces &&
            m.pendingItinerary &&
            !confirming && (
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
            )}
        </div>
      ))}
      {streamingBubble}
      {dots}
    </div>
  );

  const inputBar = (compact: boolean) => (
    <div
      className={`flex items-end gap-2 ${compact ? "border-t border-border bg-card/50 p-3" : "md:col-span-2"}`}
    >
      <div className="relative flex flex-1 items-end rounded-2xl border border-border bg-background shadow-sm transition-colors focus-within:border-[#E8A020]/60 focus-within:ring-2 focus-within:ring-[#E8A020]/20">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          rows={compact ? 1 : 2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[48px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>
      <button
        onClick={send}
        disabled={pending || !input.trim()}
        aria-label={t("send")}
        className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#E8A020] to-[#B5271D] font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-md ${
          compact ? "size-11" : "h-12 px-5"
        }`}
      >
        <Send className="size-4" />
        {!compact && <span className="hidden sm:inline">{t("send")}</span>}
      </button>
    </div>
  );

  // ── Plan view ────────────────────────────────────────────────────────
  if (plan) {
    return (
      <div className="grid h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[1fr_340px]">
        <div className="flex flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-[#FFF7ED]/60 to-transparent px-4 py-3 dark:from-[#2a1a10]/30">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-sm">
                <Sparkles className="size-4" />
              </span>
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
              <code className="rounded bg-black/5 px-1 font-mono dark:bg-white/10">ANTHROPIC_API_KEY</code> for real AI
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messageList}
          </div>

          {inputBar(true)}
        </div>

        <aside className="hidden overflow-hidden border-l border-border bg-card md:block">
          <ItinerarySidebar plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
      </div>
    );
  }

  // ── Default view ─────────────────────────────────────────────────────
  const onlyStarter = messages.length === 1;

  return (
    <div className="container mx-auto grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr_auto] gap-4 px-4 py-6 md:grid-cols-[1fr_320px] md:grid-rows-[auto_1fr_auto]">
      <div className="flex items-end justify-between gap-3 md:col-span-2">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-[28px] leading-tight tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-md">
              <Sparkles className="size-5" />
            </span>
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
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

      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-2xl border border-border bg-gradient-to-b from-card to-[#FFF7ED]/30 p-5 dark:to-transparent"
      >
        {onlyStarter ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8A020] to-[#B5271D] text-white shadow-lg shadow-[#B5271D]/20">
              <Sparkles className="size-8" />
            </span>
            <div className="max-w-md space-y-1.5">
              <h2 className="font-display text-2xl tracking-tight">{t("title")}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {STARTER.content}
              </p>
            </div>
            <div className="grid w-full max-w-md gap-2 sm:grid-cols-3">
              {[t("example1"), t("example2"), t("example3")].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-3 text-left text-xs font-medium leading-snug shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8A020]/50 hover:shadow-md"
                >
                  <span className="mb-1.5 flex size-6 items-center justify-center rounded-lg bg-[#E8A020]/15 text-[#B5271D] transition-colors group-hover:bg-[#E8A020]/25 dark:text-[#F5C842]">
                    <Sparkles className="size-3.5" />
                  </span>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messageList
        )}
      </div>

      <aside className="hidden flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 md:col-start-2 md:row-span-2 md:row-start-1 md:flex">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-[#E8A020]" />
          {t("examples")}
        </p>
        <div className="space-y-2">
          {[t("example1"), t("example2"), t("example3")].map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-xs leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8A020]/50 hover:shadow-sm"
            >
              <span className="text-muted-foreground/40 transition-colors group-hover:text-[#E8A020]">→</span>
              {ex}
            </button>
          ))}
        </div>
      </aside>

      {inputBar(false)}
    </div>
  );
}
