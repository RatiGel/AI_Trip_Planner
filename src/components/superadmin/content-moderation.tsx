"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, Trash2, X } from "lucide-react";

export interface Report {
  id: string;
  reporterEmail: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export function ContentModeration({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function act(id: string, action: "remove" | "dismiss" | "warn") {
    setLoading(id);
    const res = await fetch(`/api/superadmin/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    if (res.ok) {
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "resolved" } : r));
      toast.success(action === "remove" ? "Content removed" : action === "dismiss" ? "Report dismissed" : "User warned");
    } else {
      toast.error("Action failed");
    }
  }

  const pending = reports.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      {pending.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No pending reports.</p>
        </div>
      )}
      {pending.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-amber-500" />
                <span className="font-medium text-sm capitalize">{r.targetType} reported</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                By {r.reporterEmail} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </div>

          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Reason</p>
            <p className="text-sm mt-0.5">{r.reason}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="destructive"
              disabled={loading === r.id}
              onClick={() => act(r.id, "remove")}
            >
              <Trash2 className="size-3.5" /> Remove content
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading === r.id}
              onClick={() => act(r.id, "warn")}
            >
              Warn reporter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading === r.id}
              onClick={() => act(r.id, "dismiss")}
            >
              <X className="size-3.5" /> Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
