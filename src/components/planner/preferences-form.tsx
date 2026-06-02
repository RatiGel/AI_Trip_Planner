"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CategorySlug, TravelPreferences, TripPace } from "@/types";

const CATEGORIES: CategorySlug[] = [
  "sight",
  "museum",
  "cafe",
  "restaurant",
  "wine",
  "club",
  "park",
  "shop",
];

const PACES: TripPace[] = ["relaxed", "balanced", "packed"];

export function PreferencesForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (prefs: TravelPreferences) => void;
}) {
  const t = useTranslations("planner");
  const [days, setDays] = useState(2);
  const [pace, setPace] = useState<TripPace>("balanced");
  const [interests, setInterests] = useState("");
  const [categories, setCategories] = useState<Set<CategorySlug>>(new Set());

  function toggle(c: CategorySlug) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!interests.trim() || pending) return;
    onSubmit({
      citySlug: "tbilisi",
      days,
      pace,
      interests: interests.trim(),
      categories: categories.size ? [...categories] : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="days">{t("days")}</Label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`h-9 w-9 rounded-md border text-sm font-medium transition ${
                days === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("pace")}</Label>
        <div className="flex gap-1.5">
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(p)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition ${
                pace === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60"
              }`}
            >
              {t(`pace_${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interests">{t("interests")}</Label>
        <Textarea
          id="interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder={t("interestsPlaceholder")}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("focus")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)}>
              <Badge
                variant={categories.has(c) ? "default" : "outline"}
                className="cursor-pointer capitalize"
              >
                {c}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={pending || !interests.trim()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {pending ? t("planning") : t("generate")}
      </Button>
    </form>
  );
}
