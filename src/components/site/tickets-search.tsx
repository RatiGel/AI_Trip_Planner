"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Bus, Clock, Train, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  mockBusTickets,
  mockRailTickets,
  mockTransitPasses,
} from "@/lib/mock/tickets";
import type { TicketOption } from "@/types";

const CITIES = ["Tbilisi", "Batumi", "Kazbegi", "Kutaisi"];

function fmtDuration(min?: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function ResultRow({ option, onBuy }: { option: TicketOption; onBuy: () => void }) {
  const t = useTranslations("tickets");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {option.type === "bus" ? (
          <Bus className="size-5 text-primary" />
        ) : (
          <Train className="size-5 text-primary" />
        )}
        <div>
          <p className="font-medium">
            {option.from} <ArrowRight className="inline size-3.5 text-muted-foreground" /> {option.to}
          </p>
          <p className="text-xs text-muted-foreground">
            {option.operator} · {option.departure}–{option.arrival} · {fmtDuration(option.durationMin)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{option.priceGEL}₾</span>
        <Button size="sm" onClick={onBuy}>{t("buy")}</Button>
      </div>
    </div>
  );
}

export function TicketsSearch() {
  const t = useTranslations("tickets");
  const [tab, setTab] = useState<"bus" | "rail" | "transit-pass">("bus");
  const [from, setFrom] = useState("Tbilisi");
  const [to, setTo] = useState("Batumi");
  const [date, setDate] = useState("");

  const results = useMemo(() => {
    const list = tab === "bus" ? mockBusTickets : tab === "rail" ? mockRailTickets : [];
    return list.filter((o) => o.from === from && o.to === to);
  }, [tab, from, to]);

  function buy(o: TicketOption) {
    toast.success(`${o.operator} · ${o.priceGEL}₾`);
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="bus"><Bus className="size-4" /> {t("bus")}</TabsTrigger>
        <TabsTrigger value="rail"><Train className="size-4" /> {t("rail")}</TabsTrigger>
        <TabsTrigger value="transit-pass"><Wallet className="size-4" /> {t("transitPass")}</TabsTrigger>
      </TabsList>

      <TabsContent value="bus" className="mt-6 space-y-6">
        <RouteForm
          from={from}
          to={to}
          date={date}
          onFrom={setFrom}
          onTo={setTo}
          onDate={setDate}
        />
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("search")}…</p>
          ) : (
            results.map((o) => <ResultRow key={o.id} option={o} onBuy={() => buy(o)} />)
          )}
        </div>
      </TabsContent>

      <TabsContent value="rail" className="mt-6 space-y-6">
        <RouteForm
          from={from}
          to={to}
          date={date}
          onFrom={setFrom}
          onTo={setTo}
          onDate={setDate}
        />
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("search")}…</p>
          ) : (
            results.map((o) => <ResultRow key={o.id} option={o} onBuy={() => buy(o)} />)
          )}
        </div>
      </TabsContent>

      <TabsContent value="transit-pass" className="mt-6 grid gap-3 sm:grid-cols-3">
        {mockTransitPasses.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <Badge className="w-fit" variant="secondary">
              <Clock className="size-3.5" /> {p.operator}
            </Badge>
            <p className="text-3xl font-bold">{p.priceGEL}₾</p>
            <Button onClick={() => buy(p)}>{t("buy")}</Button>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

function RouteForm({
  from,
  to,
  date,
  onFrom,
  onTo,
  onDate,
}: {
  from: string;
  to: string;
  date: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onDate: (v: string) => void;
}) {
  const t = useTranslations("tickets");
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
      <div className="space-y-1">
        <Label className="text-xs">{t("from")}</Label>
        <Select value={from} onValueChange={(v) => v && onFrom(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("to")}</Label>
        <Select value={to} onValueChange={(v) => v && onTo(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITIES.filter((c) => c !== from).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("date")}</Label>
        <Input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button className="w-full">{t("search")}</Button>
      </div>
    </div>
  );
}
