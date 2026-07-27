"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Store, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  bizRequestStatus: "pending" | "approved" | "rejected" | null;
  bizRejectionReason: string | null;
}

// Role → credential styling. Wine for staff tiers, gold for owners, neutral for tourists.
const ROLE_STYLE: Record<string, { label: string; tone: "wine" | "gold" | "muted" }> = {
  superadmin: { label: "Super Admin", tone: "wine" },
  admin: { label: "Admin", tone: "wine" },
  business: { label: "Business Owner", tone: "gold" },
  tourist: { label: "Traveler", tone: "muted" },
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ProfileClient({
  name,
  email,
  avatarUrl,
  role,
  bizRequestStatus,
  bizRejectionReason,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<{
    businessName: string;
    businessType: string | null;
    description: string;
  }>({
    businessName: "",
    businessType: null,
    description: "",
  });

  async function submitRequest() {
    if (!form.businessName || !form.businessType || !form.description) {
      toast.error("Fill in every field to submit your request.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/business-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Request submitted — an admin will review it shortly.");
      setShowForm(false);
      setSubmitted(true);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Couldn't submit your request. Try again.");
    }
  }

  const effectiveStatus = submitted ? "pending" : bizRequestStatus;
  const roleStyle = ROLE_STYLE[role] ?? { label: role, tone: "muted" as const };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      {/* ── Identity band ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        {/* Ambient wine→gold glow, kept well below text-contrast */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, var(--color-wine) 22%, transparent), transparent 55%), radial-gradient(90% 120% at 100% 100%, color-mix(in oklch, var(--color-gold) 18%, transparent), transparent 55%)",
          }}
        />

        <div className="relative flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-8">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/15 sm:size-24">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar hosts (Google, etc.) are not in next.config remotePatterns
                <img
                  src={avatarUrl}
                  alt={name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-[var(--color-wine)] font-display text-3xl text-white sm:text-4xl">
                  {initials(name)}
                </div>
              )}
            </div>
          </div>

          {/* Name + credential */}
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Traveler Profile
            </p>
            <h1 className="mt-1 truncate font-display text-3xl leading-tight tracking-[-0.5px] sm:text-4xl">
              {name}
            </h1>
            <div className="mt-3">
              <RoleStamp label={roleStyle.label} tone={roleStyle.tone} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Field grid ─────────────────────────────────────────────── */}
      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        <Field label="Full name" value={name} />
        <Field label="Email address" value={email} />
      </dl>

      {/* ── Business owner upsell (tourists only) ──────────────────── */}
      {role === "tourist" && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
              <Store className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl leading-tight tracking-[-0.3px]">
                List your business
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your restaurant, café, hotel, or tour to the guide and reach
                travelers planning their Tbilisi trip.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {effectiveStatus === "pending" && (
              <StatusNote
                icon={<Clock className="size-4" />}
                tone="gold"
                title="Request under review"
                body="We'll email you as soon as an admin makes a decision."
              />
            )}

            {effectiveStatus === "rejected" && (
              <div className="space-y-4">
                <StatusNote
                  icon={<XCircle className="size-4" />}
                  tone="wine"
                  title="Request declined"
                  body={bizRejectionReason ?? undefined}
                />
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                  Apply again
                </Button>
              </div>
            )}

            {!effectiveStatus && !showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-light)]"
              >
                Apply now
              </Button>
            )}

            {showForm && !effectiveStatus && (
              <div className="space-y-5 rounded-xl border border-border bg-background/40 p-5">
                <div className="space-y-2">
                  <Label>Business name</Label>
                  <Input
                    value={form.businessName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, businessName: e.target.value }))
                    }
                    placeholder="e.g. Café Leila"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business type</Label>
                  <Select
                    value={form.businessType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, businessType: (v as string) ?? null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="tour">Tour operator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Tell us about your business"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={submitRequest}
                    disabled={submitting}
                    className="bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-light)]"
                  >
                    {submitting ? "Submitting…" : "Submit request"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────── */

function RoleStamp({
  label,
  tone,
}: {
  label: string;
  tone: "wine" | "gold" | "muted";
}) {
  const cls =
    tone === "wine"
      ? "bg-[var(--color-wine)]/12 text-[var(--color-wine)] dark:bg-[var(--color-wine)]/20 dark:text-[#f0857c] ring-[var(--color-wine)]/25"
      : tone === "gold"
        ? "bg-[var(--color-gold)]/12 text-[#a06d00] dark:bg-[var(--color-gold)]/20 dark:text-[var(--color-gold-light)] ring-[var(--color-gold)]/30"
        : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ${cls}`}
    >
      <BadgeCheck className="size-3.5" />
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-base font-medium">{value || "—"}</dd>
    </div>
  );
}

function StatusNote({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode;
  tone: "gold" | "wine";
  title: string;
  body?: string;
}) {
  const accent =
    tone === "gold" ? "var(--color-gold)" : "var(--color-wine)";
  return (
    <div
      className="rounded-xl border border-border bg-background/40 p-4"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>
        {icon}
        {title}
      </p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}
