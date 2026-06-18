"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Colors = {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  wine: string;
  gold: string;
};
type Typography = {
  fontFamily: string;
  baseFontSizePx: number;
  headingScale: number;
};
type Config = { colors: Colors; typography: Typography };

const FONT_OPTIONS = ["Inter", "Roboto", "Geist", "DM Serif Display"];
const SCALE_OPTIONS = [
  { label: "1.125 — minor second", value: 1.125 },
  { label: "1.200 — minor third", value: 1.2 },
  { label: "1.250 — major third", value: 1.25 },
  { label: "1.333 — perfect fourth", value: 1.333 },
  { label: "1.500 — perfect fifth", value: 1.5 },
];

const COLOR_LABELS: Record<keyof Colors, string> = {
  primary: "Primary",
  secondary: "Secondary",
  background: "Background",
  accent: "Accent",
  wine: "Wine (Brand)",
  gold: "Gold (Brand)",
};

export function ThemeEditor({ initial }: { initial: Config }) {
  const [colors, setColors] = useState<Colors>(initial.colors);
  const [typo, setTypo] = useState<Typography>(initial.typography);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors, typography: typo }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Theme saved. Reload to see site-wide changes.");
    } catch {
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Color tokens */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Color Tokens</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(colors) as Array<keyof Colors>).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={colors[key]}
                onChange={(e) =>
                  setColors((c) => ({ ...c, [key]: e.target.value }))
                }
                className="h-10 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">
                  {COLOR_LABELS[key]}
                </Label>
                <Input
                  value={colors[key]}
                  onChange={(e) =>
                    setColors((c) => ({ ...c, [key]: e.target.value }))
                  }
                  className="mt-0.5 h-7 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Typography</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Font Family</Label>
            <select
              value={typo.fontFamily}
              onChange={(e) =>
                setTypo((t) => ({ ...t, fontFamily: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Base Font Size (px)</Label>
            <Input
              type="number"
              min={12}
              max={22}
              value={typo.baseFontSizePx}
              onChange={(e) =>
                setTypo((t) => ({
                  ...t,
                  baseFontSizePx: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Heading Scale</Label>
            <select
              value={typo.headingScale}
              onChange={(e) =>
                setTypo((t) => ({
                  ...t,
                  headingScale: Number(e.target.value),
                }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SCALE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Live Preview</h2>
        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: colors.background,
            fontFamily: `${typo.fontFamily}, sans-serif`,
            fontSize: `${typo.baseFontSizePx}px`,
          }}
        >
          <h3
            style={{
              color: colors.primary,
              fontSize: `${typo.baseFontSizePx * Math.pow(typo.headingScale, 2)}px`,
              fontFamily: `${typo.fontFamily}, sans-serif`,
              fontWeight: 700,
            }}
          >
            Sample Heading
          </h3>
          <p style={{ color: colors.secondary }}>
            Sample body text using your selected font and size.
          </p>
          <div className="flex gap-2">
            <span
              className="inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: colors.wine }}
            >
              Wine
            </span>
            <span
              className="inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: colors.gold }}
            >
              Gold
            </span>
            <span
              className="inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: colors.accent }}
            >
              Accent
            </span>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} size="lg">
        {saving ? "Saving…" : "Save Theme"}
      </Button>
    </div>
  );
}
