"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  avatar: string;
  role: string;
  bizRequestStatus: "pending" | "approved" | "rejected" | null;
  bizRejectionReason: string | null;
}

export function ProfileClient({
  name,
  email,
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
      toast.error("All fields are required");
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
      toast.success("Request submitted! An admin will review it shortly.");
      setShowForm(false);
      setSubmitted(true);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to submit request");
    }
  }

  const effectiveStatus = submitted ? "pending" : bizRequestStatus;

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-8 text-2xl font-semibold">Profile</h1>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">{name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <Badge variant={role === "tourist" ? "secondary" : "default"}>
            {role}
          </Badge>
        </div>
      </div>

      {role === "tourist" && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Become a Business Owner</h2>
            <p className="text-sm text-muted-foreground mt-1">
              List your restaurant, café, hotel, or tour service on the platform.
            </p>
          </div>

          {effectiveStatus === "pending" && (
            <Badge variant="secondary">Request pending review</Badge>
          )}

          {effectiveStatus === "rejected" && (
            <div className="space-y-2">
              <Badge variant="destructive">Request rejected</Badge>
              {bizRejectionReason && (
                <p className="text-sm text-muted-foreground">
                  Reason: {bizRejectionReason}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                Apply again
              </Button>
            </div>
          )}

          {!effectiveStatus && !showForm && (
            <Button onClick={() => setShowForm(true)}>Apply now</Button>
          )}

          {showForm && !effectiveStatus && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  placeholder="e.g. Café Leila"
                />
              </div>
              <div className="space-y-2">
                <Label>Business type</Label>
                <Select
                  value={form.businessType}
                  onValueChange={(v) => setForm((f) => ({ ...f, businessType: (v as string) ?? null }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Tell us about your business"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitRequest} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
