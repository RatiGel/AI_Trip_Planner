"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Save, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { mockPlaces } from "@/lib/mock/places";
import type { ChatMessage, Place } from "@/types";

const STARTER: ChatMessage = {
  id: "m-0",
  role: "assistant",
  content:
    "Hi! Tell me about your trip — how many days, what you love (museums, nightlife, coffee, hiking…), and your budget. I'll build a plan from real curated places.",
};

function buildMockReply(prompt: string, locale: string): { reply: string; suggestions: Place[] } {
  const lower = prompt.toLowerCase();
  let pool = mockPlaces.filter((p) => p.citySlug === "tbilisi");

  if (/museum|მუზე/i.test(lower)) {
    pool = pool.filter((p) => p.categories.includes("museum") || p.categories.includes("sight"));
  } else if (/night|club|ღამ|კლუბ/i.test(lower)) {
    pool = pool.filter((p) => p.categories.includes("club") || p.categories.includes("wine"));
  } else if (/coffee|cafe|ყავ|კაფ/i.test(lower)) {
    pool = pool.filter((p) => p.categories.includes("cafe"));
  } else if (/family|kid|ბავშ/i.test(lower)) {
    pool = pool.filter((p) => p.categories.includes("park") || p.categories.includes("sight"));
  }
  if (pool.length === 0) pool = mockPlaces.filter((p) => p.citySlug === "tbilisi");

  const picks = pool.slice(0, 4);
  const intro =
    locale === "ka"
      ? "შენი შეკითხვის მიხედვით შევარჩიე ეს ადგილები:"
      : "Based on what you said, here are some picks:";
  return { reply: intro, suggestions: picks };
}

export function ChatUI() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(true);

    setTimeout(() => {
      const { reply } = buildMockReply(text, locale);
      const assistant: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
      };
      setMessages((m) => [...m, assistant]);
      setPending(false);
    }, 700);
  }

  function newChat() {
    setMessages([STARTER]);
    setInput("");
  }

  function saveTrip() {
    toast.success(t("save"));
  }

  const lastUserPrompt = [...messages].reverse().find((m) => m.role === "user")?.content;
  const suggestions = lastUserPrompt ? buildMockReply(lastUserPrompt, locale).suggestions : [];

  return (
    <div className="container mx-auto grid h-[calc(100vh-4rem)] grid-rows-[auto_1fr_auto] gap-4 px-4 py-6 md:grid-cols-[1fr_320px] md:grid-rows-[1fr_auto]">
      <div className="md:col-span-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
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
        <div className="space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex">
              <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden md:flex md:row-start-1 md:col-start-2 flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">
          {suggestions.length > 0 ? t("save") : t("examples")}
        </p>
        {suggestions.length === 0 ? (
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
        ) : (
          <div className="space-y-2">
            {suggestions.map((p) => (
              <Link
                key={p.id}
                href={`/places/${p.slug}`}
                className="block rounded-md border border-border p-2 hover:bg-accent"
              >
                <p className="text-sm font-medium">
                  {locale === "ka" ? p.nameKa : p.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.categories.slice(0, 2).map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </aside>

      <div className="md:col-span-2 flex items-end gap-2">
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
          className="min-h-[60px] resize-none"
        />
        <Button onClick={send} disabled={pending || !input.trim()} size="lg">
          <Send className="size-4" />
          <span className="hidden sm:inline">{t("send")}</span>
        </Button>
      </div>
    </div>
  );
}
