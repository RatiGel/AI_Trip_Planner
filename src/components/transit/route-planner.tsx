"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, MapPin, Search } from "lucide-react";
import type { GeocodeResult, JourneyPlan } from "@/types/transit";
import { JourneyCard } from "./journey-card";

type Field = "from" | "to";

function useGeocode() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useCallback((q: string, cb: (r: GeocodeResult[]) => void) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      cb([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transit/geocode?q=${encodeURIComponent(q)}`);
        cb(res.ok ? await res.json() : []);
      } catch {
        cb([]);
      }
    }, 400);
  }, []);
  return search;
}

export function RoutePlanner() {
  const t = useTranslations("transit");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromSel, setFromSel] = useState<GeocodeResult | null>(null);
  const [toSel, setToSel] = useState<GeocodeResult | null>(null);
  const [suggestions, setSuggestions] = useState<Record<Field, GeocodeResult[]>>({ from: [], to: [] });

  const [plans, setPlans] = useState<JourneyPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const geocode = useGeocode();

  function onInput(field: Field, value: string) {
    if (field === "from") { setFromText(value); setFromSel(null); }
    else { setToText(value); setToSel(null); }
    geocode(value, (r) => setSuggestions((s) => ({ ...s, [field]: r })));
  }

  function pick(field: Field, r: GeocodeResult) {
    if (field === "from") { setFromText(r.label); setFromSel(r); }
    else { setToText(r.label); setToSel(r); }
    setSuggestions((s) => ({ ...s, [field]: [] }));
  }

  function swap() {
    setFromText(toText); setToText(fromText);
    setFromSel(toSel); setToSel(fromSel);
  }

  async function plan() {
    if (!fromSel || !toSel) return;
    setLoading(true); setError(false); setPlans(null);
    try {
      const res = await fetch("/api/transit/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: [fromSel.lat, fromSel.lng],
          to: [toSel.lat, toSel.lng],
          locale,
        }),
      });
      if (!res.ok) { setError(true); return; }
      const data = (await res.json()) as { plans: JourneyPlan[] };
      setPlans(data.plans);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-[15px] outline-none";
  const inputStyle = {
    background: "var(--site-bg-elevated)",
    border: "1px solid var(--site-border-06)",
    color: "var(--site-text)",
  } as const;

  return (
    <div>
      <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("planTitle")}</h2>
      <p className="mt-1 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("planSubtitle")}</p>

      <div className="mt-6 flex flex-col gap-3">
        {(["from", "to"] as Field[]).map((field) => (
          <div key={field} className="relative">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" style={{ color: "var(--site-text-40)" }} />
              <input
                className={inputCls}
                style={inputStyle}
                placeholder={field === "from" ? t("fromPlaceholder") : t("toPlaceholder")}
                value={field === "from" ? fromText : toText}
                onChange={(e) => onInput(field, e.target.value)}
              />
            </div>
            {suggestions[field].length > 0 && (
              <ul
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl"
                style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
              >
                {suggestions[field].map((r, i) => (
                  <li key={i}>
                    <button
                      className="block w-full px-4 py-2.5 text-left text-[13px] hover:opacity-80"
                      style={{ color: "var(--site-text)" }}
                      onClick={() => pick(field, r)}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            onClick={swap}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]"
            style={{ background: "var(--site-bg-elevated)", color: "var(--site-text-50)" }}
          >
            <ArrowDownUp className="size-3.5" /> {t("swap")}
          </button>
          <button
            onClick={plan}
            disabled={!fromSel || !toSel || loading}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: "#0891B2", boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}
          >
            <Search className="size-4" /> {loading ? t("planning") : t("plan")}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {error && (
          <p className="rounded-xl p-4 text-[14px]" style={{ background: "rgba(181,39,29,0.1)", color: "#B5271D" }}>
            {t("unavailable")}
          </p>
        )}
        {plans && plans.length === 0 && !error && (
          <p className="text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("noResults")}</p>
        )}
        {plans?.map((p) => <JourneyCard key={p.id} plan={p} locale={locale} />)}
      </div>
    </div>
  );
}
