"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Save, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RouteMap } from "@/components/planner/route-map";
import { ItinerarySidebar } from "@/components/planner/itinerary-sidebar";
import { PlaceSelectionCards } from "@/components/chat/place-selection-cards";
import type { AIItinerary, ChatMessage, Place, RoutePlan } from "@/types";

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
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      if (data.stage === "preview") {
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: "assistant" as const,
            content: data.reply,
            type: "place-selection" as const,
            previewPlaces: data.previewPlaces,
            pendingItinerary: data.pendingItinerary,
            itineraryPlaces: data.itineraryPlaces,
          },
        ]);
        setIsMock(!!data.mock);
      } else {
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant" as const, content: data.reply },
        ]);
        if (data.plan) {
          setPlan(data.plan as RoutePlan);
          setIsMock(!!data.mock);
          setSelectedId(null);
        }
      }
    } catch {
      toast.error("Failed to get a response");
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
        // Add reply text + a route-plan message (renders inline map)
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
  }

  function saveTrip() {
    toast.success(t("save"));
  }

  const dots = (
    <div className="flex">
      <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
        <span className="inline-flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );

  // Index of the latest place-selection message — only that one shows cards.
  const latestPreviewIdx = messages.reduce(
    (best, m, i) => (m.type === "place-selection" ? i : best),
    -1,
  );

  const messageList = (
    <div className="space-y-3">
      {messages.map((m, idx) => (
        <div
          key={m.id}
          className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
        >
          {/* Text bubble — skip for empty route-plan messages */}
          {m.content && (
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          )}

          {/* Inline route map — appears right after the confirm reply */}
          {m.type === "route-plan" && plan && (
            <div className="mt-1 w-full overflow-hidden rounded-xl border border-border">
              <div className="relative h-[400px]">
                <RouteMap
                  plan={plan}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          )}

          {/* Place selection cards — only for the latest preview, not while confirming */}
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
      {pending && dots}
    </div>
  );

  const inputBar = (compact: boolean) => (
    <div
      className={`flex items-end gap-2 ${compact ? "border-t border-border p-3" : "md:col-span-2"}`}
    >
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("placeholder")}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="min-h-[52px] resize-none"
      />
      <Button
        onClick={send}
        disabled={pending || !input.trim()}
        size={compact ? "sm" : "lg"}
      >
        <Send className="size-4" />
        {!compact && <span className="hidden sm:inline">{t("send")}</span>}
      </Button>
    </div>
  );

  // ── Plan view: chat with inline map | itinerary sidebar ──────────────
  if (plan) {
    return (
      <div className="grid h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[1fr_340px]">
        {/* Left: chat (messages include inline route map) */}
        <div className="flex flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
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
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
              Preview mode — add{" "}
              <code className="font-mono">ANTHROPIC_API_KEY</code> for real AI
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messageList}
          </div>

          {inputBar(true)}
        </div>

        {/* Right: itinerary sidebar */}
        <aside className="hidden overflow-hidden border-l border-border bg-card md:block">
          <ItinerarySidebar
            plan={plan}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
      </div>
    );
  }

  // ── Default view: chat + examples sidebar ────────────────────────────
  return (
    <div className="container mx-auto grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr_auto] gap-4 px-4 py-6 md:grid-cols-[1fr_320px] md:grid-rows-[1fr_auto]">
      <div className="flex items-center justify-between md:col-span-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={newChat}>
            <Plus className="size-4" /> {t("newChat")}
          </Button>
          <Button size="sm" onClick={saveTrip}>
            <Save className="size-4" /> {t("save")}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-2xl border border-border bg-card p-4"
      >
        {messageList}
      </div>

      <aside className="hidden flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 md:col-start-2 md:row-start-1 md:flex">
        <p className="text-sm font-medium">{t("examples")}</p>
        <div className="space-y-2">
          {[t("example1"), t("example2"), t("example3")].map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:bg-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      </aside>

      {inputBar(false)}
    </div>
  );
}
