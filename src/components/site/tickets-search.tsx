"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Bus, Clock, Search, Train, Wallet } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { payNow } from "@/lib/pay";
import type { TicketOption } from "@/types";

const CITIES = ["Tbilisi", "Batumi", "Kazbegi", "Kutaisi"];

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

type TabType = "bus" | "rail" | "transit-pass";

export function TicketsSearch({ tickets }: { tickets: TicketOption[] }) {
  const t = useTranslations("tickets");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const busTickets = tickets.filter((tk) => tk.type === "bus");
  const railTickets = tickets.filter((tk) => tk.type === "rail");
  const transitPasses = tickets.filter((tk) => tk.type === "transit-pass");

  // Only offer tabs for ticket types actually present in this subset — callers
  // may pass just passes (city transport) or just bus/rail (intercity travel).
  const availableTabs: TabType[] = [
    ...(busTickets.length > 0 ? (["bus"] as const) : []),
    ...(railTickets.length > 0 ? (["rail"] as const) : []),
    ...(transitPasses.length > 0 ? (["transit-pass"] as const) : []),
  ];

  const [tab, setTab] = useState<TabType>(availableTabs[0] ?? "bus");
  const [from, setFrom] = useState("Tbilisi");
  const [to, setTo] = useState("Batumi");
  const [date, setDate] = useState("");

  // Active search state — only updates on Search click
  const [activeFrom, setActiveFrom] = useState("Tbilisi");
  const [activeTo, setActiveTo] = useState("Batumi");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const pool = tab === "bus" ? busTickets : tab === "rail" ? railTickets : [];
  const results = pool.filter((o) => o.from === activeFrom && o.to === activeTo);

  function handleSearch() {
    setSearching(true);
    setTimeout(() => {
      setActiveFrom(from);
      setActiveTo(to);
      setSearched(true);
      setSearching(false);
    }, 600);
  }

  async function buy(option: TicketOption) {
    const isDbId = /^[a-f0-9]{24}$/i.test(option.id);
    if (!isDbId) {
      toast.error("This ticket is not yet available for online purchase.");
      return;
    }
    try {
      await payNow({ purpose: "ticket", targetId: option.id, locale });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const ALL_TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "bus", label: t("bus"), icon: <Bus className="size-4" /> },
    { id: "rail", label: t("rail"), icon: <Train className="size-4" /> },
    { id: "transit-pass", label: t("transitPass"), icon: <Wallet className="size-4" /> },
  ];
  // Only show pills for ticket types present in this subset. When the caller
  // passes a single type (e.g. just transit passes, or just bus+rail), pills
  // for absent/empty categories are hidden instead of rendering an empty tab.
  const TABS = ALL_TABS.filter((tb) => availableTabs.includes(tb.id));

  const showRouteForm = tab === "bus" || tab === "rail";

  return (
    <div className="space-y-8">
      {/* Tab pills — only rendered when there's more than one type to switch between */}
      {TABS.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); setSearched(false); }}
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
      )}

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
                onClick={handleSearch}
                disabled={searching}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
              >
                {searching
                  ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Search className="size-4" />}
                {searching ? t("searching") : t("search")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {tab === "transit-pass" ? (
          <motion.div
            key="transit"
            className="grid gap-4 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {transitPasses.map((p, i) => (
              <TransitCard key={p.id} option={p} onBuy={() => buy(p)} index={i} />
            ))}
          </motion.div>
        ) : !searched ? (
          <motion.div
            key="idle"
            className="rounded-2xl py-16 text-center"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-06)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Search className="mx-auto mb-3 size-8" style={{ color: "var(--site-text-40)" }} />
            <p className="text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("searchPrompt")}</p>
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
            <p className="text-[12px] uppercase tracking-[1.5px]" style={{ color: "var(--site-text-40)" }}>
              {results.length} {t("routesFound")} · {activeFrom} → {activeTo}
            </p>
            {results.map((o, i) => (
              <TicketCard key={o.id} option={o} onBuy={() => buy(o)} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
