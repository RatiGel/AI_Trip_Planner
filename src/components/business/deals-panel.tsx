"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type OwnDeal = {
  id: string;
  title: string;
  category: string;
  priceGEL: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  createdAt: string;
};

const CATEGORIES = ["attraction", "food", "transport", "experience"] as const;

const EMPTY = {
  title: "",
  description: "",
  priceOriginal: "",
  priceGEL: "",
  category: "experience",
  validUntil: "",
  image: "",
};

export function DealsPanel({ initial }: { initial: OwnDeal[] }) {
  const [deals, setDeals] = useState<OwnDeal[]>(initial);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/business/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceOriginal: Number(form.priceOriginal),
          priceGEL: Number(form.priceGEL),
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      setDeals((d) => [
        {
          id,
          title: form.title,
          category: form.category,
          priceGEL: Number(form.priceGEL),
          status: "pending",
          rejectionReason: "",
          createdAt: new Date().toISOString(),
        },
        ...d,
      ]);
      toast.success("Deal submitted for review");
      setForm({ ...EMPTY });
      setOpen(false);
    } catch {
      toast.error("Failed to submit deal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4 mr-1.5" /> Propose a deal
        </Button>
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Original price ₾</Label>
              <Input type="number" min={0} value={form.priceOriginal} onChange={(e) => setForm((f) => ({ ...f, priceOriginal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deal price ₾</Label>
              <Input type="number" min={0} value={form.priceGEL} onChange={(e) => setForm((f) => ({ ...f, priceGEL: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Valid until</Label>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>Submit for review</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {deals.length === 0 && (
          <p className="text-sm text-muted-foreground">No deals yet. Propose one — it goes live after admin approval.</p>
        )}
        {deals.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{d.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{d.category} · ₾{d.priceGEL}</p>
              {d.status === "rejected" && d.rejectionReason && (
                <p className="text-xs text-destructive mt-0.5">Reason: {d.rejectionReason}</p>
              )}
            </div>
            <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
              {d.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
