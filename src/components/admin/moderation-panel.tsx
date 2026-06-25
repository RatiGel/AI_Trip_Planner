"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ExternalLink, Globe, Mail, MapPin, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Listing {
  id: string;
  name: string;
  nameKa: string;
  slug: string;
  citySlug: string;
  categories: string[];
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  socials: Record<string, string>;
  openingHours: { day: number; open: string; close: string; closed: boolean }[];
  createdAt: string;
  owner: { name: string; email: string } | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ModerationPanel({ initial }: { initial: Listing[] }) {
  const [items, setItems] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject", r?: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: r }),
    });
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRejecting(null);
      setReason("");
      toast.success(action === "approve" ? "Listing approved" : "Listing rejected");
    } else {
      toast.error("Action failed");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No listings awaiting review. 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((l) => {
        const open = openId === l.id;
        return (
          <div key={l.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{l.name}</h3>
                  <Badge variant="secondary" className="capitalize">{l.citySlug}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {l.owner ? `${l.owner.name} · ${l.owner.email}` : "Unknown owner"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.categories.map((c) => (
                    <span key={c} className="rounded-full bg-accent px-2.5 py-0.5 text-xs capitalize">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(open ? null : l.id)}
                >
                  Details
                  <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  disabled={busy === l.id || rejecting === l.id}
                  onClick={() => act(l.id, "approve")}
                >
                  <Check className="size-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === l.id}
                  onClick={() => setRejecting(rejecting === l.id ? null : l.id)}
                >
                  <X className="size-4" /> Reject
                </Button>
              </div>
            </div>

            {open && (
              <div className="space-y-4 border-t border-border bg-muted/30 p-5 text-sm">
                {l.description && <p className="leading-relaxed">{l.description}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {l.address && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 shrink-0" /> {l.address}
                    </span>
                  )}
                  {l.phone && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-4 shrink-0" /> {l.phone}
                    </span>
                  )}
                  {l.email && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-4 shrink-0" /> {l.email}
                    </span>
                  )}
                  {l.website && (
                    <a href={l.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Globe className="size-4 shrink-0" /> {l.website}
                    </a>
                  )}
                </div>
                {Object.entries(l.socials).filter(([, v]) => v).length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(l.socials)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline capitalize">
                          <ExternalLink className="size-3.5" /> {k}
                        </a>
                      ))}
                  </div>
                )}
                {l.openingHours.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                    {l.openingHours.map((h) => (
                      <span key={h.day} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{DAYS[h.day] ?? h.day}</span>{" "}
                        {h.closed ? "Closed" : `${h.open}–${h.close}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rejecting === l.id && (
              <div className="space-y-2 border-t border-border p-5">
                <Textarea
                  placeholder="Reason for rejection (shown to the owner)…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === l.id}
                    onClick={() => act(l.id, "reject", reason)}
                  >
                    Confirm rejection
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRejecting(null); setReason(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
