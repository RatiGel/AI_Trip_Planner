"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Global default listing fee editor. Stores tetri; edits in GEL. */
export function ListingFeeCard({ initialTetri }: { initialTetri: number }) {
  const t = useTranslations("admin");
  const [gel, setGel] = useState(String(initialTetri / 100));
  const [saving, setSaving] = useState(false);

  async function save() {
    const tetri = Math.round(Number(gel) * 100);
    if (!Number.isFinite(tetri) || tetri < 0) {
      toast.error(t("invalidFee"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingFeeTetri: tetri }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("feeSaved"));
    } catch {
      toast.error(t("feeSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t("listingFeeTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("listingFeeHint")}</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>{t("listingFeeLabel")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">₾</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={gel}
              onChange={(e) => setGel(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
