"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PlaceOption = { id: string; name: string; citySlug: string };

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  stats: "Stats bar",
  categories: "Categories",
  featured: "Featured places",
  neighborhoods: "Neighborhoods",
  aiCta: "AI planner CTA",
  listBusiness: "List your business",
};

export function LandingEditor({
  allKeys,
  initialOrder,
  initialHero,
  initialFeaturedIds,
  places,
}: {
  allKeys: string[];
  initialOrder: string[];
  initialHero: { title: string; subtitle: string; imageUrl: string };
  initialFeaturedIds: string[];
  places: PlaceOption[];
}) {
  const t = useTranslations("admin");

  // `enabled` = ordered, visible sections. `hidden` = the rest (toggled off).
  const [enabled, setEnabled] = useState<string[]>(
    initialOrder.length ? initialOrder.filter((k) => allKeys.includes(k)) : allKeys
  );
  const [hero, setHero] = useState(initialHero);
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [saving, setSaving] = useState(false);

  const hidden = allKeys.filter((k) => !enabled.includes(k));

  function move(idx: number, dir: -1 | 1) {
    setEnabled((list) => {
      const next = [...list];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return list;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  const disable = (key: string) =>
    setEnabled((list) => list.filter((k) => k !== key));
  const enable = (key: string) => setEnabled((list) => [...list, key]);

  function toggleFeatured(id: string) {
    setFeaturedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: {
            home: {
              heroTitle: hero.title,
              heroSubtitle: hero.subtitle,
              heroImageUrl: hero.imageUrl,
              componentOrder: enabled,
              featuredPlaceIds: featuredIds,
            },
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("landingSaved"));
    } catch {
      toast.error(t("landingSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sections: order + toggle */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{t("landingSections")}</h3>
          <p className="text-sm text-muted-foreground">{t("landingSectionsHint")}</p>
        </div>

        <div className="space-y-2">
          {enabled.map((key, idx) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <span className="text-xs tabular-nums text-muted-foreground w-5">{idx + 1}</span>
              <span className="flex-1 text-sm font-medium">{SECTION_LABELS[key] ?? key}</span>
              <Button size="sm" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                <ArrowUp className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === enabled.length - 1} aria-label="Move down">
                <ArrowDown className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => disable(key)} aria-label="Hide">
                <Eye className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {hidden.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("landingHidden")}
            </p>
            {hidden.map((key) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 opacity-70"
              >
                <span className="flex-1 text-sm">{SECTION_LABELS[key] ?? key}</span>
                <Button size="sm" variant="ghost" onClick={() => enable(key)} aria-label="Show">
                  <EyeOff className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hero override */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{t("landingHero")}</h3>
          <p className="text-sm text-muted-foreground">{t("landingHeroHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("landingHeroTitle")}</Label>
            <Input
              value={hero.title}
              onChange={(e) => setHero((h) => ({ ...h, title: e.target.value }))}
              placeholder="Discover"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("landingHeroImage")}</Label>
            <Input
              value={hero.imageUrl}
              onChange={(e) => setHero((h) => ({ ...h, imageUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("landingHeroSubtitle")}</Label>
            <Textarea
              value={hero.subtitle}
              onChange={(e) => setHero((h) => ({ ...h, subtitle: e.target.value }))}
              placeholder="Ancient city. Modern soul…"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Featured places picker */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{t("landingFeatured")}</h3>
          <p className="text-sm text-muted-foreground">{t("landingFeaturedHint")}</p>
        </div>
        {places.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("landingNoPlaces")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto">
            {places.map((p) => {
              const checked = featuredIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    checked ? "border-primary bg-accent" : "border-border hover:bg-accent"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleFeatured(p.id)} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.citySlug}</span>
                </label>
              );
            })}
          </div>
        )}
        {featuredIds.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("landingFeaturedFallback")}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
