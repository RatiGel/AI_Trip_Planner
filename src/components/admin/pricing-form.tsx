"use client";

import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Plan = {
  _id?: string;
  name: string;
  slug: string;
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  currency: string;
  features: string[];
  highlighted: boolean;
  active: boolean;
  order: number;
};

const EMPTY_PLAN: Plan = {
  name: "",
  slug: "",
  priceMonthlyUsd: 0,
  priceYearlyUsd: 0,
  currency: "USD",
  features: [],
  highlighted: false,
  active: true,
  order: 0,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function PricingManager({ initial }: { initial: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initial);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  function openNew() {
    setEditing({ ...EMPTY_PLAN });
    setIsNew(true);
    setFeatureInput("");
  }
  function openEdit(p: Plan) {
    setEditing({ ...p });
    setIsNew(false);
    setFeatureInput("");
  }
  function close() {
    setEditing(null);
    setIsNew(false);
  }

  async function save() {
    if (!editing) return;
    try {
      const url = isNew
        ? "/api/admin/pricing"
        : `/api/admin/pricing/${editing._id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setPlans((ps) =>
        isNew ? [...ps, saved] : ps.map((p) => (p._id === saved._id ? saved : p))
      );
      toast.success(isNew ? "Plan created" : "Plan updated");
      close();
    } catch {
      toast.error("Failed to save plan");
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    try {
      await fetch(`/api/admin/pricing/${id}`, { method: "DELETE" });
      setPlans((ps) => ps.filter((p) => p._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/pricing/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !plan.active }),
      });
      const updated = await res.json();
      setPlans((ps) => ps.map((p) => (p._id === updated._id ? updated : p)));
    } catch {
      toast.error("Failed to toggle plan");
    }
  }

  function addFeature() {
    const f = featureInput.trim();
    if (!f || !editing) return;
    setEditing((p) => p && { ...p, features: [...p.features, f] });
    setFeatureInput("");
  }

  return (
    <div className="space-y-6">
      {/* Billing toggle + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                billing === b
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-1.5" /> Add Plan
        </Button>
      </div>

      {/* Plan cards */}
      {plans.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No pricing plans yet. Add one to get started.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`relative rounded-2xl border bg-card p-6 space-y-4 transition-opacity ${
              plan.highlighted ? "border-primary shadow-md" : "border-border"
            } ${!plan.active ? "opacity-60" : ""}`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                <Star className="size-3" /> Most Popular
              </span>
            )}
            <div>
              <h3 className="text-lg font-bold">{plan.name || "Unnamed"}</h3>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                $
                {billing === "monthly"
                  ? plan.priceMonthlyUsd
                  : plan.priceYearlyUsd}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billing === "monthly" ? "mo" : "yr"}
                </span>
              </p>
            </div>

            <ul className="space-y-1.5 text-sm">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                <Pencil className="size-3.5 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant={plan.active ? "outline" : "default"}
                onClick={() => toggleActive(plan)}
              >
                {plan.active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => plan._id && deletePlan(plan._id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">
                {isNew ? "New Plan" : "Edit Plan"}
              </h2>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && {
                          ...p,
                          name: e.target.value,
                          slug: slugify(e.target.value),
                        }
                      )
                    }
                    placeholder="Free, Premium…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) =>
                      setEditing((p) => p && { ...p, slug: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Price / Month (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.priceMonthlyUsd}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && { ...p, priceMonthlyUsd: Number(e.target.value) }
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Price / Year (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.priceYearlyUsd}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && { ...p, priceYearlyUsd: Number(e.target.value) }
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.order}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && { ...p, order: Number(e.target.value) }
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.highlighted}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && { ...p, highlighted: e.target.checked }
                      )
                    }
                  />
                  Highlighted (Most Popular)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing((p) =>
                        p && { ...p, active: e.target.checked }
                      )
                    }
                  />
                  Active
                </label>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={addFeature}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <ul className="space-y-1">
                  {editing.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm py-0.5"
                    >
                      <span className="flex-1">{f}</span>
                      <button
                        onClick={() =>
                          setEditing((p) =>
                            p && {
                              ...p,
                              features: p.features.filter((_, j) => j !== i),
                            }
                          )
                        }
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
