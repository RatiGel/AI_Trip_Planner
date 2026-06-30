"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type Deal = {
  _id?: string;
  title: string;
  description: string;
  priceOriginal: number;
  priceGEL: number;
  discountPct: number;
  category: "attraction" | "food" | "transport" | "experience";
  validUntil?: string;
  image?: string;
  badge?: string;
  ownerId?: string;
  status: "pending" | "approved" | "rejected";
  active: boolean;
};

const CATEGORIES = ["attraction", "food", "transport", "experience"] as const;

const EMPTY: Deal = {
  title: "",
  description: "",
  priceOriginal: 0,
  priceGEL: 0,
  discountPct: 0,
  category: "attraction",
  validUntil: "",
  image: "",
  badge: "",
  status: "approved",
  active: true,
};

export function DealsManager({ initial }: { initial: Deal[] }) {
  const t = useTranslations("admin");
  const [deals, setDeals] = useState<Deal[]>(initial);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [isNew, setIsNew] = useState(false);

  const pending = deals.filter((d) => d.status === "pending");
  const rest = deals.filter((d) => d.status !== "pending");

  async function save() {
    if (!editing) return;
    try {
      const url = isNew ? "/api/admin/deals" : `/api/admin/deals/${editing._id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setDeals((ds) =>
        isNew ? [saved, ...ds] : ds.map((d) => (d._id === saved._id ? saved : d))
      );
      toast.success(isNew ? t("dealCreated") : t("dealUpdated"));
      setEditing(null);
    } catch {
      toast.error(t("dealSaveFailed"));
    }
  }

  async function remove(id?: string) {
    if (!id || !confirm(t("confirmDelete"))) return;
    try {
      await fetch(`/api/admin/deals/${id}`, { method: "DELETE" });
      setDeals((ds) => ds.filter((d) => d._id !== id));
      toast.success(t("delete"));
    } catch {
      toast.error(t("dealSaveFailed"));
    }
  }

  async function decide(id: string | undefined, action: "approve" | "reject") {
    if (!id) return;
    let reason = "";
    if (action === "reject") {
      reason = prompt(t("dealRejectionReason")) ?? "";
    }
    try {
      const res = await fetch(`/api/admin/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error();
      const { status } = await res.json();
      setDeals((ds) => ds.map((d) => (d._id === id ? { ...d, status } : d)));
      toast.success(action === "approve" ? t("dealApproved") : t("dealRejected"));
    } catch {
      toast.error(t("dealSaveFailed"));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing({ ...EMPTY }); setIsNew(true); }}>
          <Plus className="size-4 mr-1.5" /> {t("addNew")}
        </Button>
      </div>

      {/* Approval queue */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t("dealStatusPending")} ({pending.length})
          </h2>
          {pending.map((d) => (
            <div key={d._id} className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{d.category} · ₾{d.priceGEL} (−{d.discountPct}%)</p>
                </div>
                <Badge variant="secondary">{t("dealStatusPending")}</Badge>
              </div>
              <p className="text-sm">{d.description}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide(d._id, "approve")}>
                  <Check className="size-4" /> {t("dealApprove")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(d._id, "reject")}>
                  <X className="size-4" /> {t("dealReject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All other deals */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {t("dealsAll")} ({rest.length})
        </h2>
        {rest.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((d) => (
            <div key={d._id} className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{d.title}</p>
                <Badge variant={d.status === "approved" ? "default" : "destructive"}>{d.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{d.category} · ₾{d.priceGEL}</p>
              {d.ownerId && <p className="text-xs text-muted-foreground">{t("dealFromBusiness")}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => { setEditing({ ...d }); setIsNew(false); }}>
                  <Pencil className="size-3.5" /> {t("edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(d._id)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">{isNew ? t("addNew") : t("edit")}</h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing((d) => d && { ...d, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description} onChange={(e) => setEditing((d) => d && { ...d, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Original ₾</Label>
                  <Input type="number" min={0} value={editing.priceOriginal} onChange={(e) => setEditing((d) => d && { ...d, priceOriginal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price ₾</Label>
                  <Input type="number" min={0} value={editing.priceGEL} onChange={(e) => setEditing((d) => d && { ...d, priceGEL: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount %</Label>
                  <Input type="number" min={0} max={100} value={editing.discountPct} onChange={(e) => setEditing((d) => d && { ...d, discountPct: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                    value={editing.category}
                    onChange={(e) => setEditing((d) => d && { ...d, category: e.target.value as Deal["category"] })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input value={editing.image ?? ""} onChange={(e) => setEditing((d) => d && { ...d, image: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valid until</Label>
                  <Input type="date" value={editing.validUntil ?? ""} onChange={(e) => setEditing((d) => d && { ...d, validUntil: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge</Label>
                  <Input value={editing.badge ?? ""} onChange={(e) => setEditing((d) => d && { ...d, badge: e.target.value })} />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm pt-1">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing((d) => d && { ...d, active: e.target.checked })} />
                {t("dealActive")}
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
              <Button onClick={save}>{t("save")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
