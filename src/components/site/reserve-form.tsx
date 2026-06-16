"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CalendarDays, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { payNow } from "@/lib/pay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Place } from "@/types";

const TIMES = [
  "12:00", "12:30", "13:00", "13:30", "14:00",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
];

export function ReserveForm({ place }: { place: Place }) {
  const t = useTranslations("reserve");
  const locale = useLocale();
  const [date, setDate] = useState("");
  const [time, setTime] = useState<string>("19:00");
  const [size, setSize] = useState<string>("2");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fee = place.reservationPriceGEL ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.id,
          datetime: `${date} ${time}`,
          partySize: Number(size),
          notes,
        }),
      });
      const data = (await res.json()) as { id?: string; requiresPayment?: boolean; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Reservation failed");

      if (data.requiresPayment) {
        await payNow({ purpose: "reservation", targetId: data.id, locale });
        return; // redirects to Flitt
      }
      toast.success(
        `${t("title")} · ${locale === "ka" ? place.nameKa : place.name} · ${date} ${time}`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            {t("date")}
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {t("time")}
          </Label>
          <Select value={time} onValueChange={(v) => v && setTime(v)}>
            <SelectTrigger id="time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMES.map((tm) => (
                <SelectItem key={tm} value={tm}>{tm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="size" className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          {t("partySize")}
        </Label>
        <Select value={size} onValueChange={(v) => v && setSize(v)}>
          <SelectTrigger id="size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {fee > 0 && (
        <p className="text-sm text-muted-foreground">
          Booking fee: <span className="font-semibold text-foreground">{fee} ₾</span> — paid online.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "…" : fee > 0 ? `${t("confirm")} · ${fee} ₾` : t("confirm")}
      </Button>
    </form>
  );
}
