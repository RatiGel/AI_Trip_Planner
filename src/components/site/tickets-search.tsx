"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Bus, Clock, Tag, Train, Wallet } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { DealCategory, DealOption, TicketOption } from "@/types";

const CITIES = ["Tbilisi", "Batumi", "Kazbegi", "Kutaisi"];

const DEAL_CATEGORY_COLOR: Record<DealCategory, string> = {
  attraction: "#B5271D",
  food: "#D97706",
  transport: "#0891B2",
  experience: "#7C3AED",
};

function fmtDuration(min?: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function TicketCard({ option, onBuy, index }: { option: TicketOption; onBuy: () => void; index: number }) {
  const t = useTranslations("tickets");
  const isRail = option.type === "rail";
  return (
    <motion.div
      className="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      whileHover={{ borderColor: "rgba(232,160,32,0.25)" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: isRail ? "rgba(124,58,237,0.15)" : "rgba(181,39,29,0.15)" }}
        >
          {isRail
            ? <Train className="size-5" style={{ color: "#7C3AED" }} />
            : <Bus className="size-5" style={{ color: "#B5271D" }} />}
        </div>
        <div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--site-text)" }}>
            {option.from}
            <ArrowRight className="mx-1.5 inline size-3.5" style={{ color: "var(--site-text-40)" }} />
            {option.to}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--site-text-50)" }}>
            {option.operator} · {option.departure}–{option.arrival}
            {option.durationMin ? ` · ${fmtDuration(option.durationMin)}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="text-2xl font-bold" style={{ color: "#E8A020" }}>
          {option.priceGEL}<span className="ml-0.5 text-base">₾</span>
        </p>
        <button
          onClick={onBuy}
          className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
        >
          {t("buy")}
        </button>
      </div>
    </motion.div>
  );
}

function TransitCard({ option, onBuy, index }: { option: TicketOption; onBuy: () => void; index: number }) {
  const t = useTranslations("tickets");
  return (
    <motion.div
      className="flex flex-col gap-5 rounded-2xl p-6"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ borderColor: "rgba(8,145,178,0.3)" }}
    >
      <div className="flex size-11 items-center justify-center rounded-full" style={{ background: "rgba(8,145,178,0.15)" }}>
        <Wallet className="size-5" style={{ color: "#0891B2" }} />
      </div>
      <div>
        <p className="text-[13px]" style={{ color: "var(--site-text-50)" }}>{option.operator}</p>
        <p className="mt-1 text-4xl font-bold" style={{ color: "var(--site-text)" }}>
          {option.priceGEL}<span className="ml-1 text-xl" style={{ color: "#E8A020" }}>₾</span>
        </p>
      </div>
      <button
        onClick={onBuy}
        className="w-full rounded-full py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
        style={{ background: "#0891B2", boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}
      >
        {t("buy")}
      </button>
    </motion.div>
  );
}

function DealCard({ deal, onGrab, index }: { deal: DealOption; onGrab: () => void; index: number }) {
  const t = useTranslations("tickets");
  const color = DEAL_CATEGORY_COLOR[deal.category];
  return (
    <motion.div
      className="group overflow-hidden rounded-2xl"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      whileHover={{ y: -4, borderColor: "rgba(232,160,32,0.25)" }}
    >
      {deal.image && (
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
          <Image
            src={deal.image}
            alt={deal.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Discount badge */}
          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ background: "#16A34A" }}
          >
            -{deal.discountPct}% {t("discount")}
          </div>
          {/* Category + optional promo badge */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ background: color }}
            >
              {deal.category}
            </span>
            {deal.badge && (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                {deal.badge}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-display mb-1.5 text-lg" style={{ color: "var(--site-text)" }}>{deal.title}</h3>
        <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed" style={{ color: "var(--site-text-50)" }}>
          {deal.description}
        </p>
        {deal.validUntil && (
          <p className="mb-3 flex items-center gap-1 text-[11px] uppercase tracking-[1px]" style={{ color: "var(--site-text-40)" }}>
            <Clock className="size-3" />
            {t("validUntil")} {deal.validUntil}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] line-through" style={{ color: "var(--site-text-35)" }}>
              {deal.priceOriginal}₾
            </p>
            <p className="text-xl font-bold" style={{ color: "#E8A020" }}>
              {deal.priceGEL}<span className="ml-0.5 text-base">₾</span>
            </p>
          </div>
          <button
            onClick={onGrab}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
          >
            {t("grab")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

type TabType = "bus" | "rail" | "transit-pass" | "deal";

export function TicketsSearch({ tickets, deals }: { tickets: TicketOption[]; deals: DealOption[] }) {
  const t = useTranslations("tickets");
  const [tab, setTab] = useState<TabType>("bus");
  const [from, setFrom] = useState("Tbilisi");
  const [to, setTo] = useState("Batumi");
  const [date, setDate] = useState("");

  const busTickets = tickets.filter((t) => t.type === "bus");
  const railTickets = tickets.filter((t) => t.type === "rail");
  const transitPasses = tickets.filter((t) => t.type === "transit-pass");

  const results = useMemo(() => {
    const list = tab === "bus" ? busTickets : tab === "rail" ? railTickets : [];
    return list.filter((o) => o.from === from && o.to === to);
  }, [tab, from, to, busTickets, railTickets]);

  function buy(label: string, price: number) {
    toast.success(`${label} · ${price}₾`, { description: "Redirecting to payment…" });
  }

  const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "bus", label: t("bus"), icon: <Bus className="size-4" /> },
    { id: "rail", label: t("rail"), icon: <Train className="size-4" /> },
    { id: "transit-pass", label: t("transitPass"), icon: <Wallet className="size-4" /> },
    { id: "deal", label: t("deals"), icon: <Tag className="size-4" /> },
  ];

  const showRouteForm = tab === "bus" || tab === "rail";

  return (
    <div className="space-y-8">
      {/* Tab pills */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all"
            style={
              tab === tb.id
                ? { background: "#B5271D", color: "#fff", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }
                : { background: "var(--site-bg-elevated)", color: "var(--site-text-50)", border: "1px solid var(--site-border-08)" }
            }
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {/* Route form — bus/rail only */}
      <AnimatePresence mode="wait">
        {showRouteForm && (
          <motion.div
            key="route-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid gap-3 rounded-2xl p-5 md:grid-cols-4"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-06)" }}
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: "var(--site-text-40)" }}>
                {t("from")}
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                style={{ background: "var(--site-bg-elevated)", color: "var(--site-text)", border: "1px solid var(--site-border-08)" }}
              >
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: "var(--site-text-40)" }}>
                {t("to")}
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                style={{ background: "var(--site-bg-elevated)", color: "var(--site-text)", border: "1px solid var(--site-border-08)" }}
              >
                {CITIES.filter((c) => c !== from).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: "var(--site-text-40)" }}>
                {t("date")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                style={{ background: "var(--site-bg-elevated)", color: "var(--site-text)", border: "1px solid var(--site-border-08)" }}
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-xl py-2.5 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
              >
                {t("search")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {tab === "deal" ? (
          <motion.div
            key="deals"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {deals.map((deal, i) => (
              <DealCard key={deal.id} deal={deal} onGrab={() => buy(deal.title, deal.priceGEL)} index={i} />
            ))}
          </motion.div>
        ) : tab === "transit-pass" ? (
          <motion.div
            key="transit"
            className="grid gap-4 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {transitPasses.map((p, i) => (
              <TransitCard key={p.id} option={p} onBuy={() => buy(p.operator, p.priceGEL)} index={i} />
            ))}
          </motion.div>
        ) : results.length === 0 ? (
          <motion.div
            key="empty"
            className="rounded-2xl py-16 text-center"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-06)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Clock className="mx-auto mb-3 size-8" style={{ color: "var(--site-text-40)" }} />
            <p className="text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("noResults")}</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {results.map((o, i) => (
              <TicketCard key={o.id} option={o} onBuy={() => buy(`${o.operator}`, o.priceGEL)} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
