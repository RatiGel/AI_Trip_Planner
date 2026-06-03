"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

export interface BusinessRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessName: string;
  businessType: string;
  description: string;
  status: string;
  createdAt: string;
}

export function BusinessesApproval({ requests: initial }: { requests: BusinessRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function approve(id: string) {
    setLoading(true);
    const res = await fetch(`/api/superadmin/businesses/${id}/approve`, { method: "PATCH" });
    setLoading(false);
    if (res.ok) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" } : r));
      toast.success("Business approved — user role updated to business");
    } else {
      toast.error("Failed to approve");
    }
  }

  async function reject(id: string) {
    setLoading(true);
    const res = await fetch(`/api/superadmin/businesses/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setLoading(false);
    if (res.ok) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
      setRejectId(null);
      setRejectReason("");
      toast.success("Request rejected");
    } else {
      toast.error("Failed to reject");
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No pending business requests.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Pending ({pending.length})
          </h2>
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.businessName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{r.businessType} · {r.userName} ({r.userEmail})</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
              <p className="text-sm">{r.description}</p>

              {rejectId === r.id ? (
                <div className="space-y-2">
                  <Label>Rejection reason (optional)</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why the request was rejected…"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => reject(r.id)} disabled={loading}>
                      Confirm reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r.id)} disabled={loading}>
                    <Check className="size-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)} disabled={loading}>
                    <X className="size-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Decided ({decided.length})
          </h2>
          {decided.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{r.businessName}</p>
                <p className="text-xs text-muted-foreground">{r.userName} · {r.businessType}</p>
              </div>
              <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
