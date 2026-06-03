"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  placeId: string;
  placeName: string;
  userName: string;
  rating: number;
  text: string;
  reply?: string | null;
  createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export function ReviewsTable({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReply(id: string) {
    if (!replyText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/business/reviews/${id}/reply`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText }),
    });
    setSaving(false);
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, reply: replyText } : r))
      );
      setReplyId(null);
      setReplyText("");
      toast.success("Reply saved");
    } else {
      toast.error("Failed to save reply");
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{r.userName}</p>
              <p className="text-xs text-muted-foreground">
                {r.placeName} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
            <StarRating rating={r.rating} />
          </div>

          <p className="text-sm text-muted-foreground">{r.text}</p>

          {r.reply ? (
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your reply</p>
              <p className="text-sm">{r.reply}</p>
            </div>
          ) : replyId === r.id ? (
            <div className="space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submitReply(r.id)} disabled={saving}>
                  {saving ? "Saving…" : "Post reply"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setReplyId(null); setReplyText(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setReplyId(r.id)}>
              <MessageSquare className="size-3.5" /> Reply
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
