"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownUp, MapPin, Search, Route, Loader2, Crosshair, LocateFixed } from "lucide-react";
import type { GeocodeResult, JourneyPlan } from "@/types/transit";
import { useGeolocation } from "@/hooks/use-geolocation";
import { JourneyCard } from "./journey-card";
import { JourneyMap } from "./journey-map";

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
  const tMap = useTranslations("map");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const listId = useId();

  const { coords: userCoords, tracking, error: geoError, watch, stop } = useGeolocation();
  const [recenterTick, setRecenterTick] = useState(0);

  useEffect(() => {
    if (geoError) toast.error(tMap(geoError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoError]);

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromSel, setFromSel] = useState<GeocodeResult | null>(null);
  const [toSel, setToSel] = useState<GeocodeResult | null>(null);
  const [suggestions, setSuggestions] = useState<Record<Field, GeocodeResult[]>>({ from: [], to: [] });
  const [active, setActive] = useState<Field | null>(null);

  const [plans, setPlans] = useState<JourneyPlan[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fromLocating, setFromLocating] = useState(false);

  const geocode = useGeocode();

  const selectedPlan = plans?.find((p) => p.id === selectedId) ?? null;

  function onInput(field: Field, value: string) {
    if (field === "from") { setFromText(value); setFromSel(null); }
    else { setToText(value); setToSel(null); }
    geocode(value, (r) => setSuggestions((s) => ({ ...s, [field]: r })));
  }

  function pick(field: Field, r: GeocodeResult) {
    if (field === "from") { setFromText(r.label); setFromSel(r); }
    else { setToText(r.label); setToSel(r); }
    setSuggestions((s) => ({ ...s, [field]: [] }));
    setActive(null);
  }

  function swap() {
    setFromText(toText); setToText(fromText);
    setFromSel(toSel); setToSel(fromSel);
  }

  // One-shot: fill the From field from the device location, reverse-geocoded.
  // Independent of the live-tracking hook — this needs a single fix, once.
  function fillFromWithMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error(tMap("geoUnavailable"));
      return;
    }
    setFromLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let result: GeocodeResult | null = null;
        try {
          const res = await fetch(`/api/transit/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) result = (await res.json()) as GeocodeResult | null;
        } catch {
          result = null;
        }
        const filled: GeocodeResult = result ?? { label: t("myLocation"), lat, lng };
        setFromText(filled.label);
        setFromSel(filled);
        setSuggestions((s) => ({ ...s, from: [] }));
        setFromLocating(false);
      },
      (err) => {
        const key = err.code === 1 ? "geoDenied" : err.code === 3 ? "geoTimeout" : "geoUnavailable";
        toast.error(tMap(key));
        setFromLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
      setSelectedId(data.plans[0]?.id ?? null); // auto-select fastest route
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const canPlan = !!fromSel && !!toSel && !loading;

  function renderField(field: Field) {
    const text = field === "from" ? fromText : toText;
    const dotColor = field === "from" ? "var(--site-text-40)" : "#B5271D";
    const sugg = suggestions[field];
    return (
      <div className="relative">
        <div
          className="flex items-center gap-3 rounded-xl px-3 transition-colors"
          style={{
            background: "var(--site-bg-elevated)",
            border: `1px solid ${active === field ? "var(--site-border-20)" : "var(--site-border-06)"}`,
          }}
        >
          {field === "from" ? (
            <span className="grid size-4 shrink-0 place-items-center">
              <span className="size-2.5 rounded-full ring-2" style={{ background: "transparent", color: dotColor, boxShadow: `inset 0 0 0 2px ${dotColor}` }} />
            </span>
          ) : (
            <MapPin className="size-4 shrink-0" style={{ color: dotColor, fill: "rgba(181,39,29,0.15)" }} />
          )}
          <input
            className="w-full bg-transparent py-3 text-[15px] outline-none"
            style={{ color: "var(--site-text)" }}
            placeholder={field === "from" ? t("fromPlaceholder") : t("toPlaceholder")}
            value={text}
            role="combobox"
            aria-expanded={active === field && sugg.length > 0}
            aria-controls={`${listId}-${field}`}
            autoComplete="off"
            onFocus={() => setActive(field)}
            onChange={(e) => onInput(field, e.target.value)}
          />
          {field === "from" && (
            <button
              type="button"
              onClick={fillFromWithMyLocation}
              disabled={fromLocating}
              aria-label={t("myLocation")}
              title={t("myLocation")}
              className="mr-8 grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-[var(--site-surface-08)] disabled:opacity-50"
              style={{ color: "var(--site-text-50)" }}
            >
              {fromLocating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LocateFixed className="size-4" />
              )}
            </button>
          )}
        </div>
        {active === field && sugg.length > 0 && (
          <ul
            id={`${listId}-${field}`}
            role="listbox"
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl shadow-lg"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-10)" }}
          >
            {sugg.map((r, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--site-surface-08)]"
                  style={{ color: "var(--site-text)" }}
                  onMouseDown={(e) => { e.preventDefault(); pick(field, r); }}
                >
                  <MapPin className="size-3.5 shrink-0" style={{ color: "var(--site-text-40)" }} />
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* ── Left: search + results ── */}
      <div className="min-w-0">
        <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("planTitle")}</h2>
        <p className="mt-1 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("planSubtitle")}</p>

        <div className="mt-6">
          <div className="relative flex flex-col gap-2.5">
            {renderField("from")}
            {renderField("to")}
            {/* Vertical connector + swap */}
            <button
              type="button"
              onClick={swap}
              aria-label={t("swap")}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full transition-transform hover:rotate-180"
              style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-10)", color: "var(--site-text-60)" }}
            >
              <ArrowDownUp className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={plan}
            disabled={!canPlan}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            style={{ background: "#0891B2", boxShadow: canPlan ? "0 4px 20px rgba(8,145,178,0.3)" : "none" }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? t("planning") : t("plan")}
          </button>
        </div>

        {/* ── Results list ── */}
        <div className="mt-8">
          {loading && (
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[132px] animate-pulse rounded-2xl"
                  style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              className="flex items-start gap-3 rounded-2xl p-5 text-[14px]"
              style={{ background: "rgba(181,39,29,0.1)", border: "1px solid rgba(181,39,29,0.2)", color: "#e06a60" }}
            >
              <Route className="mt-0.5 size-5 shrink-0" />
              <span>{t("unavailable")}</span>
            </div>
          )}

          {!loading && plans && plans.length === 0 && !error && (
            <EmptyResults title={t("noResults")} hint={t("noResultsHint")} />
          )}

          {!loading && !plans && !error && (
            <EmptyResults idle title={t("idleTitle")} hint={t("idleHint")} />
          )}

          {!loading && plans && plans.length > 0 && (
            <div className="flex flex-col gap-4">
              {plans.map((p) => (
                <JourneyCard
                  key={p.id}
                  plan={p}
                  locale={locale}
                  selected={p.id === selectedId}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: map (sticky on desktop) ── */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="relative h-[420px] lg:h-[calc(100vh-8rem)]">
          <JourneyMap
            plan={selectedPlan}
            userCoords={userCoords}
            tracking={tracking}
            recenterTick={recenterTick}
          />
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={tracking ? stop : watch}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
              style={{
                background: tracking ? "#0891B2" : "var(--site-header-bg)",
                border: "1px solid var(--site-border-10)",
                color: tracking ? "#fff" : "var(--site-text-65)",
              }}
            >
              <Crosshair className="size-3.5" />
              {tracking ? t("stopFollowing") : t("followMe")}
            </button>
            {tracking && userCoords && (
              <button
                type="button"
                onClick={() => setRecenterTick((n) => n + 1)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
                style={{ background: "var(--site-header-bg)", border: "1px solid var(--site-border-10)", color: "var(--site-text-65)" }}
              >
                <LocateFixed className="size-3.5" />
                {t("recenter")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyResults({ title, hint, idle }: { title: string; hint: string; idle?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
      style={{
        background: idle ? "transparent" : "var(--site-bg-elevated)",
        border: `1px dashed ${idle ? "var(--site-border-10)" : "var(--site-border-06)"}`,
      }}
    >
      <span className="grid size-12 place-items-center rounded-full" style={{ background: "var(--site-surface-08)" }}>
        <Route className="size-5" style={{ color: "var(--site-text-40)" }} />
      </span>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--site-text)" }}>{title}</p>
      <p className="mt-1 max-w-xs text-[13px]" style={{ color: "var(--site-text-50)" }}>{hint}</p>
    </div>
  );
}
